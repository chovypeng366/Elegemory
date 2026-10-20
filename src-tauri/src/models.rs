use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub path: String,
    pub relative_path: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteBlock {
    pub id: String,
    pub note_id: String,
    pub block_type: String,
    pub content: String,
    pub asset_id: Option<String>,
    pub asset: Option<Asset>,
    pub sort_order: i64,
    pub is_completed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    #[serde(rename = "type")]
    pub note_type: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub blocks: Vec<NoteBlock>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewBlock {
    pub block_type: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub asset_id: Option<String>,
    #[serde(default)]
    pub is_completed: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    #[serde(default)]
    pub title: Option<String>,
    pub blocks: Vec<NewBlock>,
    #[serde(default)]
    pub feedback_kind: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperFeedback {
    pub workday_key: String,
    pub note_created_count: i64,
    pub todo_created_count: i64,
    pub daily_mood: String,
    pub kind: String,
    pub is_tenth: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteResult {
    pub note: Note,
    pub whisper: Option<WhisperFeedback>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordWhisperInput {
    pub phrase_id: String,
    pub category: String,
    pub note_type: String,
    pub shown_at: i64,
    pub workday_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperHistoryEntry {
    pub id: String,
    pub phrase_id: String,
    pub category: String,
    pub note_type: String,
    pub shown_at: i64,
    pub workday_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageInput {
    pub bytes: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub db_path: String,
    pub note_count: i64,
    pub archived_count: i64,
    pub asset_count: i64,
}
