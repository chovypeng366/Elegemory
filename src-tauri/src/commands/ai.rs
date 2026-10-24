use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;

use crate::db::Db;

const KEYRING_SERVICE: &str = "com.elegemory.desktop";
const KEYRING_USER: &str = "deepseek_api_key";
const API_URL: &str = "https://api.deepseek.com/chat/completions";
const MODEL_CHAT: &str = "deepseek-chat";
const MODEL_REASONER: &str = "deepseek-reasoner";
const AI_ENABLED_KEY: &str = "ai_enabled";
const AI_MODEL_KEY: &str = "ai_model";
const MAX_INPUT_CHARS: usize = 12_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    pub configured: bool,
    pub enabled: bool,
    pub model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiTestResult {
    pub model: String,
    pub latency_ms: u128,
    pub reply: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    model: Option<String>,
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ErrorEnvelope {
    error: Option<ErrorBody>,
}

#[derive(Debug, Deserialize)]
struct ErrorBody {
    message: Option<String>,
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|error| format!("无法访问系统凭据存储：{error}"))
}

fn read_stored_key() -> Result<Option<String>, String> {
    match keyring_entry()?.get_password() {
        Ok(key) if !key.trim().is_empty() => Ok(Some(key)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("无法读取 API 密钥：{error}")),
    }
}

fn effective_key() -> Result<String, String> {
    if let Some(key) = read_stored_key()? {
        return Ok(key);
    }

    #[cfg(debug_assertions)]
    if let Ok(key) = std::env::var("DEEPSEEK_API_KEY") {
        let key = key.trim().to_string();
        if !key.is_empty() {
            return Ok(key);
        }
    }

    Err("尚未配置 DeepSeek API 密钥".to_string())
}

fn has_configured_key() -> Result<bool, String> {
    if read_stored_key()?.is_some() {
        return Ok(true);
    }

    #[cfg(debug_assertions)]
    if let Ok(key) = std::env::var("DEEPSEEK_API_KEY") {
        if !key.trim().is_empty() {
            return Ok(true);
        }
    }

    Ok(false)
}

fn selected_model(state: &Db) -> String {
    match state.get_setting(AI_MODEL_KEY).ok().flatten().as_deref() {
        Some(MODEL_REASONER) => MODEL_REASONER.to_string(),
        _ => MODEL_CHAT.to_string(),
    }
}

fn status_for(state: &Db) -> Result<AiStatus, String> {
    Ok(AiStatus {
        configured: has_configured_key()?,
        enabled: state
            .get_setting(AI_ENABLED_KEY)?
            .as_deref()
            .map(|value| value == "1")
            .unwrap_or(false),
        model: selected_model(state),
    })
}

fn normalize_input(text: &str) -> Result<String, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("这条记录没有可供 AI 分析的文字".to_string());
    }
    Ok(trimmed.chars().take(MAX_INPUT_CHARS).collect())
}

async fn chat(
    key: &str,
    model: &str,
    system: &str,
    user: &str,
    max_tokens: u32,
    json_mode: bool,
) -> Result<(String, Option<String>), String> {
    let mut payload = json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user }
        ],
        "temperature": 0.3,
        "max_tokens": max_tokens,
        "stream": false
    });
    if json_mode {
        payload["response_format"] = json!({ "type": "json_object" });
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| format!("无法初始化网络请求：{error}"))?;

    let response = client
        .post(API_URL)
        .bearer_auth(key)
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("无法连接 DeepSeek：{error}"))?;

    let status = response.status();
    let raw = response
        .text()
        .await
        .map_err(|error| format!("读取 DeepSeek 响应失败：{error}"))?;

    if !status.is_success() {
        let message = serde_json::from_str::<ErrorEnvelope>(&raw)
            .ok()
            .and_then(|value| value.error)
            .and_then(|value| value.message)
            .unwrap_or_else(|| "请检查 API 密钥、模型或账户余额".to_string());
        let hint = match status.as_u16() {
            401 | 403 => "API 密钥无效或没有权限",
            429 => "请求过于频繁，请稍后再试",
            _ => "DeepSeek 请求失败",
        };
        return Err(format!("{hint}（HTTP {}）：{message}", status.as_u16()));
    }

    let parsed: ChatResponse =
        serde_json::from_str(&raw).map_err(|_| "DeepSeek 返回了无法识别的响应".to_string())?;
    let content = parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "DeepSeek 没有返回内容".to_string())?
        .to_string();

    Ok((content, parsed.model))
}

fn clean_title(raw: &str) -> String {
    let first_line = raw.lines().next().unwrap_or("").trim();
    let unquoted = first_line
        .trim_matches('"')
        .trim_matches('“')
        .trim_matches('”')
        .trim_matches('「')
        .trim_matches('」')
        .trim();
    unquoted
        .trim_end_matches(['。', '．', '.', '，', ',', '：', ':'])
        .chars()
        .take(40)
        .collect::<String>()
        .trim()
        .to_string()
}

fn clean_summary(raw: &str) -> String {
    raw.trim()
        .trim_matches('`')
        .chars()
        .take(600)
        .collect::<String>()
        .trim()
        .to_string()
}

fn clean_todo_candidate(candidate: &str) -> String {
    candidate
        .trim()
        .trim_start_matches(['-', '*', '•'])
        .trim_start_matches(|character: char| character.is_ascii_digit())
        .trim_start_matches(['.', '、', ')', '）'])
        .trim()
        .trim_matches(['"', '“', '”'])
        .trim()
        .chars()
        .take(160)
        .collect::<String>()
}

fn parse_todos(raw: &str) -> Vec<String> {
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let value = serde_json::from_str::<serde_json::Value>(cleaned).ok();
    let candidates: Vec<String> = match value {
        Some(serde_json::Value::Array(items)) => items
            .into_iter()
            .filter_map(|item| item.as_str().map(str::to_string))
            .collect(),
        Some(serde_json::Value::Object(map)) => map
            .get("todos")
            .and_then(serde_json::Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default(),
        _ => cleaned.lines().map(str::to_string).collect(),
    };

    let mut seen = std::collections::HashSet::new();
    let mut todos = Vec::new();
    for candidate in candidates {
        let item = clean_todo_candidate(&candidate);
        if item.is_empty() || !seen.insert(item.clone()) {
            continue;
        }
        todos.push(item);
        if todos.len() >= 8 {
            break;
        }
    }
    todos
}

#[tauri::command]
pub fn ai_status(state: State<'_, Db>) -> Result<AiStatus, String> {
    status_for(&state)
}

#[tauri::command]
pub fn ai_save_key(state: State<'_, Db>, key: String) -> Result<AiStatus, String> {
    let key = key.trim();
    if key.len() < 8 || key.len() > 256 {
        return Err("API 密钥长度不合法".to_string());
    }
    keyring_entry()?
        .set_password(key)
        .map_err(|error| format!("无法保存 API 密钥：{error}"))?;
    let _ = state.set_setting(AI_ENABLED_KEY, "1");
    status_for(&state)
}

#[tauri::command]
pub fn ai_clear_key(state: State<'_, Db>) -> Result<AiStatus, String> {
    match keyring_entry()?.delete_credential() {
        Ok(()) => {}
        Err(keyring::Error::NoEntry) => {}
        Err(error) => return Err(format!("无法删除 API 密钥：{error}")),
    }
    state.set_setting(AI_ENABLED_KEY, "0")?;
    status_for(&state)
}

#[tauri::command]
pub async fn ai_test(state: State<'_, Db>) -> Result<AiTestResult, String> {
    let key = effective_key()?;
    let model = selected_model(&state);
    let started = Instant::now();
    let (reply, response_model) = chat(
        &key,
        &model,
        "You are a connection test. Reply with exactly: OK",
        "Reply with exactly: OK",
        16,
        false,
    )
    .await?;
    Ok(AiTestResult {
        model: response_model.unwrap_or(model),
        latency_ms: started.elapsed().as_millis(),
        reply,
    })
}

#[tauri::command]
pub async fn ai_suggest_title(state: State<'_, Db>, text: String) -> Result<String, String> {
    let text = normalize_input(&text)?;
    let key = effective_key()?;
    let model = selected_model(&state);
    let (raw, _) = chat(
        &key,
        &model,
        "你是轻量速记应用 Elegemory 的标题助手。根据记录内容生成一个简洁、具体的中文标题，6 到 14 个汉字。不使用引号、句号、冒号或前缀，只输出标题本身。",
        &format!("记录内容：\n{text}"),
        120,
        false,
    )
    .await?;
    let title = clean_title(&raw);
    if title.is_empty() {
        return Err("AI 没有生成有效的标题".to_string());
    }
    Ok(title)
}

#[tauri::command]
pub async fn ai_summarize(state: State<'_, Db>, text: String) -> Result<String, String> {
    let text = normalize_input(&text)?;
    let key = effective_key()?;
    let model = selected_model(&state);
    let (raw, _) = chat(
        &key,
        &model,
        "你是轻量速记应用 Elegemory 的整理助手。用一到两句简体中文概括记录，不超过 80 个汉字，保留关键信息，不添加原文没有的内容。只输出摘要本身。",
        &format!("记录内容：\n{text}"),
        200,
        false,
    )
    .await?;
    let summary = clean_summary(&raw);
    if summary.is_empty() {
        return Err("AI 没有生成有效的摘要".to_string());
    }
    Ok(summary)
}

#[tauri::command]
pub async fn ai_extract_todos(state: State<'_, Db>, text: String) -> Result<Vec<String>, String> {
    let text = normalize_input(&text)?;
    let key = effective_key()?;
    let model = selected_model(&state);
    let (raw, _) = chat(
        &key,
        &model,
        "你是轻量速记应用 Elegemory 的待办提取助手。从记录中提取明确、可执行的待办事项，只返回 JSON 对象 {\"todos\":[\"事项\"]}。最多 8 条；如果没有明确待办，返回 {\"todos\":[]}。不要包含解释。",
        &format!("记录内容：\n{text}"),
        300,
        true,
    )
    .await?;
    Ok(parse_todos(&raw))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleans_generated_titles() {
        assert_eq!(clean_title("「山间的清晨」"), "山间的清晨");
        assert_eq!(clean_title("\"周末清单。\"\n补充说明"), "周末清单");
        assert_eq!(clean_title("  重新整理书桌  "), "重新整理书桌");
    }

    #[test]
    fn parses_todo_payloads_and_fallbacks() {
        assert_eq!(
            parse_todos("{\"todos\":[\"买牛奶\",\"给妈妈打电话\"]}"),
            vec!["买牛奶", "给妈妈打电话"]
        );
        assert_eq!(
            parse_todos("```json\n{\"todos\":[\"- 写周报\"]}\n```"),
            vec!["写周报"]
        );
        assert_eq!(parse_todos("1. 回邮件\n2. 订机票"), vec!["回邮件", "订机票"]);
        assert!(parse_todos("{\"todos\":[]}").is_empty());
    }

    #[tokio::test]
    #[ignore = "requires DEEPSEEK_API_KEY and network access"]
    async fn live_deepseek_round_trip() {
        let key = std::env::var("DEEPSEEK_API_KEY").expect("DEEPSEEK_API_KEY is required");
        let (reply, model) = chat(
            &key,
            MODEL_CHAT,
            "Reply with exactly: OK",
            "Reply with exactly: OK",
            16,
            false,
        )
        .await
        .expect("DeepSeek should reply");
        assert_eq!(reply.trim(), "OK");
        assert!(model.is_some());
    }

    #[test]
    #[ignore = "touches Windows Credential Manager"]
    fn keyring_round_trip() {
        let entry = keyring::Entry::new(KEYRING_SERVICE, "elegemory_test_key")
            .expect("credential entry");
        entry.set_password("sk-test-value").expect("save test key");
        assert_eq!(entry.get_password().expect("read test key"), "sk-test-value");
        entry.delete_credential().expect("delete test key");
    }
}
