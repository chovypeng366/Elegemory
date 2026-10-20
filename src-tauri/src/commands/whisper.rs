use chrono::{Duration, NaiveDateTime};
use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;
use uuid::Uuid;

use crate::db::{self, Db};
use crate::models::{RecordWhisperInput, WhisperFeedback, WhisperHistoryEntry};

const MOODS: [&str; 6] = ["Warm", "Poetic", "Playful", "Calm", "Cozy", "Reflective"];

pub fn workday_key_for(local: NaiveDateTime) -> String {
    (local - Duration::hours(5))
        .format("%Y-%m-%d")
        .to_string()
}

pub fn register_creation(
    conn: &Connection,
    kind: &str,
    local: NaiveDateTime,
    now_ms: i64,
) -> Result<WhisperFeedback, String> {
    let column = match kind {
        "note" => "note_created_count",
        "todo" => "todo_created_count",
        _ => return Err("无法识别的记录类型".to_string()),
    };

    let workday_key = workday_key_for(local);
    let existing_mood: Option<String> = conn
        .query_row(
            "SELECT daily_mood FROM daily_feedback_stats WHERE workday_key = ?1",
            [&workday_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(db::error)?;

    let daily_mood = match existing_mood {
        Some(mood) => mood,
        None => {
            let mood = choose_mood(conn, local)?;
            conn.execute(
                "INSERT INTO daily_feedback_stats
                    (workday_key, note_created_count, todo_created_count, daily_mood, updated_at)
                 VALUES (?1, 0, 0, ?2, ?3)",
                params![&workday_key, &mood, now_ms],
            )
            .map_err(db::error)?;
            mood
        }
    };

    conn.execute(
        &format!(
            "UPDATE daily_feedback_stats
             SET {column} = {column} + 1, updated_at = ?1
             WHERE workday_key = ?2"
        ),
        params![now_ms, &workday_key],
    )
    .map_err(db::error)?;

    let (note_created_count, todo_created_count): (i64, i64) = conn
        .query_row(
            "SELECT note_created_count, todo_created_count
             FROM daily_feedback_stats WHERE workday_key = ?1",
            [&workday_key],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(db::error)?;

    let is_tenth = if kind == "todo" {
        todo_created_count == 10
    } else {
        note_created_count == 10
    };

    Ok(WhisperFeedback {
        workday_key,
        note_created_count,
        todo_created_count,
        daily_mood,
        kind: kind.to_string(),
        is_tenth,
    })
}

fn choose_mood(conn: &Connection, local: NaiveDateTime) -> Result<String, String> {
    let previous_key = workday_key_for(local - Duration::days(1));
    let previous: Option<String> = conn
        .query_row(
            "SELECT daily_mood FROM daily_feedback_stats WHERE workday_key = ?1",
            [&previous_key],
            |row| row.get(0),
        )
        .optional()
        .map_err(db::error)?;

    let candidates: Vec<&str> = MOODS
        .iter()
        .copied()
        .filter(|mood| previous.as_deref() != Some(*mood))
        .collect();
    let pool = if candidates.is_empty() {
        MOODS.to_vec()
    } else {
        candidates
    };
    let index = (Uuid::new_v4().as_u128() % pool.len() as u128) as usize;
    Ok(pool[index].to_string())
}

#[tauri::command]
pub fn record_whisper(state: State<'_, Db>, input: RecordWhisperInput) -> Result<(), String> {
    if input.phrase_id.trim().is_empty() {
        return Err("低语文案为空".to_string());
    }
    if input.phrase_id.len() > 120
        || input.category.len() > 64
        || input.note_type.len() > 32
        || input.workday_key.len() > 32
    {
        return Err("低语记录内容过长".to_string());
    }

    let conn = state.conn();
    conn.execute(
        "INSERT INTO whisper_history
            (id, phrase_id, category, note_type, shown_at, workday_key)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            Uuid::new_v4().to_string(),
            input.phrase_id,
            input.category,
            input.note_type,
            input.shown_at,
            input.workday_key
        ],
    )
    .map_err(db::error)?;
    Ok(())
}

#[tauri::command]
pub fn list_whisper_history(
    state: State<'_, Db>,
    since: i64,
) -> Result<Vec<WhisperHistoryEntry>, String> {
    let conn = state.conn();
    let mut stmt = conn
        .prepare(
            "SELECT id, phrase_id, category, note_type, shown_at, workday_key
             FROM whisper_history
             WHERE shown_at >= ?1
             ORDER BY shown_at ASC",
        )
        .map_err(db::error)?;

    let rows = stmt
        .query_map([since], |row| {
            Ok(WhisperHistoryEntry {
                id: row.get(0)?,
                phrase_id: row.get(1)?,
                category: row.get(2)?,
                note_type: row.get(3)?,
                shown_at: row.get(4)?,
                workday_key: row.get(5)?,
            })
        })
        .map_err(db::error)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(db::error)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, NaiveTime};

    fn at(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(year, month, day)
            .unwrap()
            .and_time(NaiveTime::from_hms_opt(hour, minute, 0).unwrap())
    }

    #[test]
    fn workday_switches_at_five_am() {
        assert_eq!(
            workday_key_for(at(2026, 10, 21, 4, 59)),
            "2026-10-20"
        );
        assert_eq!(
            workday_key_for(at(2026, 10, 21, 5, 0)),
            "2026-10-21"
        );
    }

    #[test]
    fn creation_stats_increment_and_avoid_repeating_mood() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../../migrations/002_whisper.sql"))
            .unwrap();

        let first = register_creation(&conn, "note", at(2026, 10, 21, 9, 0), 1_000).unwrap();
        assert_eq!(first.note_created_count, 1);
        assert_eq!(first.todo_created_count, 0);

        let second = register_creation(&conn, "todo", at(2026, 10, 21, 9, 5), 2_000).unwrap();
        assert_eq!(second.note_created_count, 1);
        assert_eq!(second.todo_created_count, 1);
        assert_eq!(second.daily_mood, first.daily_mood);

        let next_day = register_creation(&conn, "note", at(2026, 10, 22, 9, 0), 3_000).unwrap();
        assert_eq!(next_day.note_created_count, 1);
        assert_eq!(next_day.todo_created_count, 0);
        assert_ne!(next_day.daily_mood, first.daily_mood);
    }
}
