use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

use chrono::{Local, Timelike};
use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};
use tauri::State;
use uuid::Uuid;

use crate::commands::ai;
use crate::db::{self, Db};
use crate::models::{
    GraphEdge, GraphNode, LinkGraph, LinkSuggestion, MemoryEcho, Note, NoteLinkEntry,
};

const ECHO_MIN_AGE_MS: i64 = 5 * 24 * 60 * 60 * 1000;
const SUGGESTION_WINDOW_MS: i64 = 7 * 24 * 60 * 60 * 1000;
const SUGGESTION_LIMIT: usize = 2;

const STOP_TERMS: &[&str] = &[
    "这个", "一个", "我们", "你们", "他们", "可以", "今天", "明天", "昨天", "自己",
    "没有", "什么", "因为", "所以", "如果", "但是", "然后", "已经", "还是", "就是",
    "不是", "这样", "时候", "记录", "感觉", "可能", "觉得", "真的", "东西", "事情",
    "一种", "一些", "有点", "只是", "不要", "需要", "现在", "开始", "其实", "比较",
    "非常", "还有", "以及", "或者", "而且", "不过", "虽然", "然而", "之后", "之前",
    "一点", "一直", "一起", "看到", "想到", "写下", "留下", "如何", "the", "and",
    "for", "with", "that", "this", "from", "your", "you", "are", "was", "were",
    "have", "has", "had", "not", "but",
];

fn days_ago(timestamp: i64, now: i64) -> i64 {
    (now - timestamp).max(0) / 86_400_000
}

fn echo_slot() -> String {
    let now = Local::now();
    let period = match now.hour() {
        5..=10 => "morning",
        11..=13 => "noon",
        14..=17 => "afternoon",
        _ => "evening",
    };
    format!("{}-{period}", now.format("%Y-%m-%d"))
}

fn note_text(note: &Note) -> String {
    note.blocks
        .iter()
        .filter(|block| block.block_type != "image" && !block.content.trim().is_empty())
        .map(|block| block.content.trim())
        .collect::<Vec<_>>()
        .join("\n")
}

fn is_cjk(character: char) -> bool {
    matches!(
        character as u32,
        0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xF900..=0xFAFF
    )
}

fn push_cjk_terms(run: &str, terms: &mut HashSet<String>) {
    let characters: Vec<char> = run.chars().collect();
    if characters.is_empty() {
        return;
    }
    if characters.len() == 1 {
        terms.insert(characters[0].to_string());
        return;
    }
    for window in characters.windows(2) {
        terms.insert(window.iter().collect());
    }
}

fn push_latin_terms(run: &str, terms: &mut HashSet<String>) {
    if run.chars().count() >= 3 && !run.chars().all(|character| character.is_ascii_digit()) {
        terms.insert(run.to_string());
    }
}

fn extract_terms(text: &str) -> HashSet<String> {
    let mut terms = HashSet::new();
    let mut cjk_run = String::new();
    let mut latin_run = String::new();

    for character in text.chars() {
        if is_cjk(character) {
            push_latin_terms(&latin_run, &mut terms);
            latin_run.clear();
            cjk_run.push(character);
        } else if character.is_ascii_alphanumeric() {
            push_cjk_terms(&cjk_run, &mut terms);
            cjk_run.clear();
            latin_run.push(character.to_ascii_lowercase());
        } else {
            push_cjk_terms(&cjk_run, &mut terms);
            push_latin_terms(&latin_run, &mut terms);
            cjk_run.clear();
            latin_run.clear();
        }
    }
    push_cjk_terms(&cjk_run, &mut terms);
    push_latin_terms(&latin_run, &mut terms);

    terms.retain(|term| !STOP_TERMS.contains(&term.as_str()));
    terms.retain(|term| !term.chars().all(|character| character.is_ascii_digit()));
    terms
}

fn token_weights(title: &str, content: &str) -> HashMap<String, f64> {
    let mut weights = HashMap::new();
    for term in extract_terms(title) {
        weights.insert(term, 3.0);
    }
    for term in extract_terms(content) {
        weights.entry(term).or_insert(1.0);
    }
    weights
}

fn similarity(
    source: &HashMap<String, f64>,
    candidate: &HashMap<String, f64>,
) -> (f64, Vec<String>) {
    let mut shared: Vec<(String, f64)> = source
        .iter()
        .filter_map(|(term, weight)| {
            candidate
                .get(term)
                .map(|candidate_weight| (term.clone(), weight.min(*candidate_weight)))
        })
        .collect();
    shared.sort_by(|left, right| {
        right
            .1
            .partial_cmp(&left.1)
            .unwrap_or(Ordering::Equal)
            .then_with(|| right.0.chars().count().cmp(&left.0.chars().count()))
    });

    let score = shared.iter().map(|(_, weight)| weight).sum();
    let labels = shared
        .iter()
        .take(2)
        .map(|(term, _)| term.clone())
        .collect();
    (score, labels)
}

fn canonical_pair(note_id: &str, related_id: &str) -> Result<(String, String), String> {
    let note_id = note_id.trim();
    let related_id = related_id.trim();
    if note_id.is_empty() || related_id.is_empty() {
        return Err("关联记录不能为空".to_string());
    }
    if note_id == related_id {
        return Err("不能把一条记录关联到自己".to_string());
    }
    Ok(if note_id < related_id {
        (note_id.to_string(), related_id.to_string())
    } else {
        (related_id.to_string(), note_id.to_string())
    })
}

fn list_links_for(state: &Db, note_id: &str) -> Result<Vec<NoteLinkEntry>, String> {
    let partners = {
        let conn = state.conn();
        let mut stmt = conn
            .prepare(
                "SELECT CASE WHEN note_a_id = ?1 THEN note_b_id ELSE note_a_id END, created_at
                 FROM note_links
                 WHERE note_a_id = ?1 OR note_b_id = ?1",
            )
            .map_err(db::error)?;
        let rows = stmt
            .query_map([note_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(db::error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db::error)?
    };

    let conn = state.conn();
    let mut entries = Vec::new();
    for (partner_id, linked_at) in partners {
        if let Ok(note) = db::load_note(&conn, &state.data_dir, &partner_id) {
            entries.push(NoteLinkEntry { note, linked_at });
        }
    }
    entries.sort_by_key(|entry| entry.note.created_at);
    Ok(entries)
}

#[tauri::command]
pub fn get_memory_echo(state: State<'_, Db>) -> Result<Option<MemoryEcho>, String> {
    let now = db::now_ms();
    let slot = echo_slot();
    let last_slot = state
        .get_setting("memory_echo_last_slot")?
        .unwrap_or_default();
    if last_slot == slot {
        return Ok(None);
    }

    let last_note_id = state
        .get_setting("memory_echo_last_note_id")?
        .unwrap_or_default();
    let cutoff = now - ECHO_MIN_AGE_MS;

    let picked = {
        let conn = state.conn();
        let note_id: Option<String> = conn
            .query_row(
                "SELECT n.id
                 FROM notes n
                 WHERE n.is_archived = 0
                   AND n.created_at <= ?1
                   AND n.id <> ?2
                   AND EXISTS (
                     SELECT 1 FROM note_blocks b
                     WHERE b.note_id = n.id
                       AND b.block_type IN ('text', 'todo')
                       AND trim(b.content) <> ''
                   )
                 ORDER BY n.is_favorite DESC,
                          COALESCE(n.last_opened_at, 0) ASC,
                          n.created_at ASC
                 LIMIT 1",
                params![cutoff, last_note_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(db::error)?;

        match note_id {
            Some(note_id) => {
                let note = db::load_note(&conn, &state.data_dir, &note_id)?;
                Some((note_id, note))
            }
            None => None,
        }
    };

    let Some((note_id, note)) = picked else {
        return Ok(None);
    };

    state.set_setting("memory_echo_last_slot", &slot)?;
    state.set_setting("memory_echo_last_note_id", &note_id)?;
    Ok(Some(MemoryEcho {
        days_ago: days_ago(note.created_at, now),
        note,
    }))
}

#[tauri::command]
pub fn mark_note_opened(state: State<'_, Db>, id: String) -> Result<(), String> {
    let changed = state
        .conn()
        .execute(
            "UPDATE notes SET last_opened_at = ?1 WHERE id = ?2",
            params![db::now_ms(), id],
        )
        .map_err(db::error)?;
    if changed == 0 {
        return Err("记录不存在或已被删除".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn list_note_links(
    state: State<'_, Db>,
    note_id: String,
) -> Result<Vec<NoteLinkEntry>, String> {
    list_links_for(&state, &note_id)
}

#[tauri::command]
pub fn create_note_link(
    state: State<'_, Db>,
    note_id: String,
    related_id: String,
    source: Option<String>,
) -> Result<Vec<NoteLinkEntry>, String> {
    let (note_a_id, note_b_id) = canonical_pair(&note_id, &related_id)?;
    let source = source.unwrap_or_else(|| "manual".to_string());
    if source != "manual" && source != "suggested" {
        return Err("关联来源不合法".to_string());
    }

    {
        let conn = state.conn();
        let existing: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM notes
                 WHERE id IN (?1, ?2) AND is_archived = 0",
                params![note_a_id, note_b_id],
                |row| row.get(0),
            )
            .map_err(db::error)?;
        if existing < 2 {
            return Err("只能关联仍然存在的记录".to_string());
        }

        conn.execute(
            "INSERT OR IGNORE INTO note_links
                (id, note_a_id, note_b_id, created_at, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                Uuid::new_v4().to_string(),
                note_a_id,
                note_b_id,
                db::now_ms(),
                source
            ],
        )
        .map_err(db::error)?;
    }

    list_links_for(&state, &note_id)
}

#[tauri::command]
pub fn delete_note_link(
    state: State<'_, Db>,
    note_id: String,
    related_id: String,
) -> Result<Vec<NoteLinkEntry>, String> {
    let (note_a_id, note_b_id) = canonical_pair(&note_id, &related_id)?;
    {
        let conn = state.conn();
        conn.execute(
            "DELETE FROM note_links WHERE note_a_id = ?1 AND note_b_id = ?2",
            params![note_a_id, note_b_id],
        )
        .map_err(db::error)?;
    }
    list_links_for(&state, &note_id)
}

fn load_unlinked_candidates(
    state: &Db,
    note_id: &str,
    limit: i64,
) -> Result<Vec<Note>, String> {
    let candidate_ids = {
        let conn = state.conn();
        let mut stmt = conn
            .prepare(
                "SELECT n.id
                 FROM notes n
                 WHERE n.is_archived = 0
                   AND n.id <> ?1
                   AND EXISTS (
                     SELECT 1 FROM note_blocks b
                     WHERE b.note_id = n.id
                       AND b.block_type IN ('text', 'todo')
                       AND trim(b.content) <> ''
                   )
                   AND NOT EXISTS (
                     SELECT 1 FROM note_links l
                     WHERE (l.note_a_id = ?1 AND l.note_b_id = n.id)
                        OR (l.note_b_id = ?1 AND l.note_a_id = n.id)
                   )
                 ORDER BY n.created_at DESC
                 LIMIT ?2",
            )
            .map_err(db::error)?;
        let rows = stmt
            .query_map(params![note_id, limit], |row| row.get::<_, String>(0))
            .map_err(db::error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db::error)?
    };

    let conn = state.conn();
    let mut candidates = Vec::new();
    for candidate_id in candidate_ids {
        if let Ok(note) = db::load_note(&conn, &state.data_dir, &candidate_id) {
            candidates.push(note);
        }
    }
    Ok(candidates)
}

#[tauri::command]
pub fn find_link_suggestions(
    state: State<'_, Db>,
    note_id: String,
) -> Result<Vec<LinkSuggestion>, String> {
    let now = db::now_ms();
    let source = {
        let conn = state.conn();
        db::load_note(&conn, &state.data_dir, &note_id)?
    };
    if source.is_archived {
        return Ok(Vec::new());
    }
    let candidates = load_unlinked_candidates(&state, &note_id, 300)?;

    let source_text = note_text(&source);
    if source_text.trim().is_empty() {
        return Ok(Vec::new());
    }
    if now.saturating_sub(source.created_at) > SUGGESTION_WINDOW_MS {
        return Ok(Vec::new());
    }
    let source_terms = token_weights(&source.title, &source_text);
    if source_terms.is_empty() {
        return Ok(Vec::new());
    }

    let mut scored: Vec<(f64, LinkSuggestion)> = Vec::new();
    for candidate in candidates {
        let candidate_text = note_text(&candidate);
        if candidate_text.trim().is_empty() {
            continue;
        }
        let candidate_terms = token_weights(&candidate.title, &candidate_text);
        let (score, shared) = similarity(&source_terms, &candidate_terms);
        if shared.len() >= 2 && score >= 2.0 {
            scored.push((
                score,
                LinkSuggestion {
                    days_ago: days_ago(candidate.created_at, now),
                    note: candidate,
                    reason: None,
                    source: "local".to_string(),
                },
            ));
        }
    }

    scored.sort_by(|left, right| {
        right
            .0
            .partial_cmp(&left.0)
            .unwrap_or(Ordering::Equal)
            .then_with(|| right.1.note.created_at.cmp(&left.1.note.created_at))
    });

    Ok(scored
        .into_iter()
        .take(SUGGESTION_LIMIT)
        .map(|(_, suggestion)| suggestion)
        .collect())
}

fn parse_ai_matches(raw: &str) -> Vec<(String, String)> {
    let trimmed = raw.trim();
    let cleaned = trimmed
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let candidate = match (cleaned.find('{'), cleaned.rfind('}')) {
        (Some(start), Some(end)) if end > start => &cleaned[start..=end],
        _ => cleaned,
    };
    let Ok(value) = serde_json::from_str::<Value>(candidate) else {
        return Vec::new();
    };
    let Some(matches) = value.get("matches").and_then(Value::as_array) else {
        return Vec::new();
    };

    let mut seen = HashSet::new();
    let mut parsed = Vec::new();
    for item in matches {
        let Some(id) = item.get("id").and_then(Value::as_str) else {
            continue;
        };
        let id = id.trim().to_string();
        if id.is_empty() || !seen.insert(id.clone()) {
            continue;
        }
        let reason = item
            .get("reason")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .chars()
            .take(120)
            .collect::<String>();
        parsed.push((id, reason));
        if parsed.len() >= 3 {
            break;
        }
    }
    parsed
}

#[tauri::command]
pub async fn find_ai_link_suggestions(
    state: State<'_, Db>,
    note_id: String,
) -> Result<Vec<LinkSuggestion>, String> {
    let now = db::now_ms();
    let source = {
        let conn = state.conn();
        db::load_note(&conn, &state.data_dir, &note_id)?
    };
    if source.is_archived {
        return Ok(Vec::new());
    }

    let source_text = note_text(&source);
    if source_text.trim().is_empty() {
        return Ok(Vec::new());
    }
    let candidates = load_unlinked_candidates(&state, &note_id, 24)?;
    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let payload: Vec<Value> = candidates
        .iter()
        .map(|candidate| {
            json!({
                "id": candidate.id,
                "title": candidate.title,
                "daysAgo": days_ago(candidate.created_at, now),
                "excerpt": note_text(candidate).chars().take(320).collect::<String>(),
            })
        })
        .collect();
    let candidate_json =
        serde_json::to_string(&payload).map_err(|error| format!("候选记录整理失败：{error}"))?;

    let key = ai::effective_key()?;
    let model = ai::selected_model(&state);
    let system = "你是 Elegemory 的记忆关联助手。判断候选记录与当前记录是否在讨论同一主题、同一项目，或存在前后发展的关系。只返回 JSON 对象 {\"matches\":[{\"id\":\"候选记录 id\",\"reason\":\"不超过30字的理由\"}]}。最多返回 3 条；没有把握就返回 {\"matches\":[]}。不要输出解释。";
    let user = format!(
        "当前记录：\n标题：{}\n内容：{}\n\n候选记录 JSON：\n{}",
        source.title,
        source_text.chars().take(2400).collect::<String>(),
        candidate_json
    );
    let (raw, _) = ai::chat(&key, &model, system, &user, 700, true).await?;

    let matches = parse_ai_matches(&raw);
    if matches.is_empty() {
        return Ok(Vec::new());
    }

    let by_id: HashMap<&str, &Note> = candidates
        .iter()
        .map(|candidate| (candidate.id.as_str(), candidate))
        .collect();
    let mut suggestions = Vec::new();
    for (candidate_id, reason) in matches {
        let Some(note) = by_id.get(candidate_id.as_str()) else {
            continue;
        };
        suggestions.push(LinkSuggestion {
            days_ago: days_ago(note.created_at, now),
            note: (*note).clone(),
            reason: if reason.is_empty() { None } else { Some(reason) },
            source: "ai".to_string(),
        });
    }
    Ok(suggestions)
}

fn connected_edges(edges: Vec<GraphEdge>, focus_id: &str) -> Vec<GraphEdge> {
    if !edges
        .iter()
        .any(|edge| edge.source == focus_id || edge.target == focus_id)
    {
        return Vec::new();
    }

    let mut adjacency: HashMap<String, Vec<String>> = HashMap::new();
    for edge in &edges {
        adjacency
            .entry(edge.source.clone())
            .or_default()
            .push(edge.target.clone());
        adjacency
            .entry(edge.target.clone())
            .or_default()
            .push(edge.source.clone());
    }

    let mut visited = HashSet::new();
    let mut stack = vec![focus_id.to_string()];
    while let Some(current) = stack.pop() {
        if !visited.insert(current.clone()) {
            continue;
        }
        if let Some(neighbours) = adjacency.get(&current) {
            for neighbour in neighbours {
                if !visited.contains(neighbour) {
                    stack.push(neighbour.clone());
                }
            }
        }
    }

    edges
        .into_iter()
        .filter(|edge| visited.contains(&edge.source) && visited.contains(&edge.target))
        .collect()
}

#[tauri::command]
pub fn get_link_graph(
    state: State<'_, Db>,
    note_id: Option<String>,
) -> Result<LinkGraph, String> {
    let raw_edges = {
        let conn = state.conn();
        let mut stmt = conn
            .prepare(
                "SELECT l.note_a_id, l.note_b_id, l.created_at, l.created_by
                 FROM note_links l
                 JOIN notes a ON a.id = l.note_a_id
                 JOIN notes b ON b.id = l.note_b_id
                 WHERE a.is_archived = 0 AND b.is_archived = 0
                 ORDER BY l.created_at ASC",
            )
            .map_err(db::error)?;
        let rows = stmt
            .query_map([], |row| {
                Ok(GraphEdge {
                    source: row.get(0)?,
                    target: row.get(1)?,
                    created_at: row.get(2)?,
                    created_by: row.get(3)?,
                })
            })
            .map_err(db::error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db::error)?
    };

    let edges = match note_id.as_deref().map(str::trim) {
        Some(focus_id) if !focus_id.is_empty() => connected_edges(raw_edges, focus_id),
        _ => raw_edges,
    };

    let mut degree: HashMap<String, i64> = HashMap::new();
    for edge in &edges {
        *degree.entry(edge.source.clone()).or_insert(0) += 1;
        *degree.entry(edge.target.clone()).or_insert(0) += 1;
    }

    let conn = state.conn();
    let mut nodes = Vec::new();
    for (note_id, node_degree) in degree {
        let node = conn
            .query_row(
                "SELECT id, title, type, created_at, is_favorite
                 FROM notes WHERE id = ?1 AND is_archived = 0",
                [&note_id],
                |row| {
                    Ok(GraphNode {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        note_type: row.get(2)?,
                        created_at: row.get(3)?,
                        is_favorite: row.get::<_, i64>(4)? != 0,
                        degree: node_degree,
                    })
                },
            )
            .optional()
            .map_err(db::error)?;
        if let Some(node) = node {
            nodes.push(node);
        }
    }
    nodes.sort_by_key(|node| node.created_at);

    Ok(LinkGraph { nodes, edges })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_pairs_are_stable() {
        assert_eq!(
            canonical_pair("b", "a").expect("valid pair"),
            ("a".to_string(), "b".to_string())
        );
        assert_eq!(
            canonical_pair("a", "b").expect("valid pair"),
            ("a".to_string(), "b".to_string())
        );
        assert!(canonical_pair("a", "a").is_err());
    }

    #[test]
    fn extracts_and_filters_terms() {
        let terms = extract_terms("今天想开发一款速记软件，卡片可以慢一点。");
        assert!(terms.contains("速记"));
        assert!(terms.contains("软件"));
        assert!(!terms.contains("今天"));
        assert!(!terms.contains("可以"));
    }

    #[test]
    fn similarity_finds_shared_ideas() {
        let source = token_weights(
            "想开发一款速记软件",
            "如何让记录更轻，卡片可以慢一点",
        );
        let candidate = token_weights(
            "如何优化卡片动画",
            "速记软件的卡片动画和记录体验",
        );
        let (score, shared) = similarity(&source, &candidate);
        assert!(shared.len() >= 2);
        assert!(score >= 2.0);
    }

    #[test]
    fn days_are_non_negative() {
        assert_eq!(days_ago(1_000, 1_000 + 86_400_000 * 5), 5);
        assert_eq!(days_ago(1_000, 1_000), 0);
    }

    #[test]
    fn parses_ai_match_payloads() {
        let matches = parse_ai_matches(
            "```json\n{\"matches\":[{\"id\":\"a\",\"reason\":\"同一项目\"},{\"id\":\"b\",\"reason\":\"后续想法\"},{\"id\":\"a\",\"reason\":\"重复\"}]}\n```",
        );
        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].0, "a");
        assert_eq!(matches[0].1, "同一项目");
        assert!(parse_ai_matches("not json").is_empty());
        assert!(parse_ai_matches("{\"matches\":[]}").is_empty());
    }

    #[test]
    fn graph_keeps_only_the_focused_component() {
        let edge = |source: &str, target: &str| GraphEdge {
            source: source.to_string(),
            target: target.to_string(),
            created_at: 0,
            created_by: "manual".to_string(),
        };
        let edges = vec![
            edge("a", "b"),
            edge("b", "c"),
            edge("x", "y"),
        ];
        let filtered = connected_edges(edges, "b");
        assert_eq!(filtered.len(), 2);
        assert!(filtered
            .iter()
            .all(|item| item.source != "x" && item.target != "y"));

        assert!(connected_edges(vec![edge("x", "y")], "a").is_empty());
    }
}
