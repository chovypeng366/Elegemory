use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use tauri::State;
use uuid::Uuid;

use crate::db::{self, Db};
use crate::models::{CreateNoteInput, NewBlock, Note};

fn validate_block(block: &NewBlock) -> Result<(), String> {
    match block.block_type.as_str() {
        "image" => {
            if block
                .asset_id
                .as_deref()
                .map(str::trim)
                .unwrap_or_default()
                .is_empty()
            {
                return Err("图片块缺少图片资源".to_string());
            }
        }
        "text" | "todo" => {}
        other => return Err(format!("不支持的块类型：{other}")),
    }
    Ok(())
}

fn derive_type(blocks: &[NewBlock]) -> &'static str {
    let has_image = blocks.iter().any(|b| b.block_type == "image");
    let has_text = blocks
        .iter()
        .any(|b| b.block_type == "text" && !b.content.trim().is_empty());
    let has_todo = blocks.iter().any(|b| b.block_type == "todo");

    if has_image && (has_text || has_todo) {
        "mixed"
    } else if has_image {
        "image"
    } else if has_todo && !has_text {
        "todo"
    } else {
        "text"
    }
}

fn derive_title(blocks: &[NewBlock]) -> String {
    if let Some(block) = blocks
        .iter()
        .find(|b| b.block_type != "image" && !b.content.trim().is_empty())
    {
        let normalized = block
            .content
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");
        let mut chars = normalized.chars();
        let short: String = chars.by_ref().take(48).collect();
        if chars.next().is_some() {
            format!("{short}…")
        } else {
            short
        }
    } else if blocks.iter().any(|b| b.block_type == "image") {
        "图片速记".to_string()
    } else {
        "未命名速记".to_string()
    }
}

fn insert_block(
    conn: &Connection,
    note_id: &str,
    block: &NewBlock,
    sort_order: i64,
) -> Result<(), String> {
    let content = if block.block_type == "image" {
        String::new()
    } else {
        block.content.trim_end().to_string()
    };

    conn.execute(
        "INSERT INTO note_blocks
            (id, note_id, block_type, content, asset_id, sort_order, is_completed)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            Uuid::new_v4().to_string(),
            note_id,
            block.block_type,
            content,
            block.asset_id,
            sort_order,
            if block.is_completed { 1 } else { 0 }
        ],
    )
    .map_err(db::error)?;

    Ok(())
}

fn touch_note(conn: &Connection, note_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE notes SET updated_at = ?1 WHERE id = ?2",
        params![db::now_ms(), note_id],
    )
    .map_err(db::error)?;
    Ok(())
}

fn refresh_note_type(conn: &Connection, note_id: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT block_type, content FROM note_blocks WHERE note_id = ?1")
        .map_err(db::error)?;
    let rows = stmt
        .query_map([note_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(db::error)?;

    let mut has_image = false;
    let mut has_text = false;
    let mut has_todo = false;

    for row in rows {
        let (block_type, content) = row.map_err(db::error)?;
        match block_type.as_str() {
            "image" => has_image = true,
            "todo" => has_todo = true,
            "text" if !content.trim().is_empty() => has_text = true,
            _ => {}
        }
    }

    let note_type = if has_image && (has_text || has_todo) {
        "mixed"
    } else if has_image {
        "image"
    } else if has_todo && !has_text {
        "todo"
    } else {
        "text"
    };

    conn.execute(
        "UPDATE notes SET type = ?1 WHERE id = ?2",
        params![note_type, note_id],
    )
    .map_err(db::error)?;

    Ok(())
}

fn block_note_id(conn: &Connection, block_id: &str) -> Result<(String, String), String> {
    conn.query_row(
        "SELECT note_id, block_type FROM note_blocks WHERE id = ?1",
        [block_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
    .map_err(db::error)?
    .ok_or_else(|| "内容块不存在或已被删除".to_string())
}

#[tauri::command]
pub fn list_notes(state: State<'_, Db>) -> Result<Vec<Note>, String> {
    let conn = state.conn();
    db::load_notes(&conn, &state.data_dir)
}

#[tauri::command]
pub fn create_note(state: State<'_, Db>, input: CreateNoteInput) -> Result<Note, String> {
    let mut blocks = input.blocks;
    for block in &mut blocks {
        if block.block_type == "image" {
            block.content.clear();
        }
        block.content = block.content.trim_end().to_string();
    }
    blocks.retain(|b| !b.content.trim().is_empty() || b.asset_id.is_some());

    if blocks.is_empty() {
        return Err("内容为空，无法保存".to_string());
    }
    for block in &blocks {
        validate_block(block)?;
    }

    let note_type = derive_type(&blocks);
    let title = input
        .title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| derive_title(&blocks));

    let note_id = Uuid::new_v4().to_string();
    let now = db::now_ms();
    let mut conn = state.conn();
    let tx = conn.transaction().map_err(db::error)?;

    tx.execute(
        "INSERT INTO notes
            (id, type, title, created_at, updated_at, is_pinned, is_favorite, is_archived)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0)",
        params![note_id, note_type, title, now, now],
    )
    .map_err(db::error)?;

    for (index, block) in blocks.iter().enumerate() {
        insert_block(&tx, &note_id, block, index as i64)?;
    }

    tx.commit().map_err(db::error)?;
    db::load_note(&conn, &state.data_dir, &note_id)
}

#[tauri::command]
pub fn set_note_title(
    state: State<'_, Db>,
    id: String,
    title: String,
) -> Result<Note, String> {
    let conn = state.conn();
    let changed = conn
        .execute(
            "UPDATE notes SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title.trim(), db::now_ms(), id],
        )
        .map_err(db::error)?;
    if changed == 0 {
        return Err("记录不存在或已被删除".to_string());
    }
    db::load_note(&conn, &state.data_dir, &id)
}

fn set_flag(state: &Db, id: &str, column: &str, value: bool) -> Result<Note, String> {
    let column = match column {
        "is_favorite" | "is_pinned" | "is_archived" => column,
        _ => return Err("不支持的状态字段".to_string()),
    };

    let conn = state.conn();
    let changed = conn
        .execute(
            &format!(
                "UPDATE notes SET {column} = ?1, updated_at = ?2 WHERE id = ?3"
            ),
            params![if value { 1 } else { 0 }, db::now_ms(), id],
        )
        .map_err(db::error)?;

    if changed == 0 {
        return Err("记录不存在或已被删除".to_string());
    }
    db::load_note(&conn, &state.data_dir, id)
}

#[tauri::command]
pub fn set_note_favorite(
    state: State<'_, Db>,
    id: String,
    value: bool,
) -> Result<Note, String> {
    set_flag(&state, &id, "is_favorite", value)
}

#[tauri::command]
pub fn set_note_pinned(
    state: State<'_, Db>,
    id: String,
    value: bool,
) -> Result<Note, String> {
    set_flag(&state, &id, "is_pinned", value)
}

#[tauri::command]
pub fn set_note_archived(
    state: State<'_, Db>,
    id: String,
    value: bool,
) -> Result<Note, String> {
    set_flag(&state, &id, "is_archived", value)
}

#[tauri::command]
pub fn add_block(
    state: State<'_, Db>,
    note_id: String,
    block: NewBlock,
) -> Result<Note, String> {
    let mut block = block;
    if block.block_type == "image" {
        block.content.clear();
    }
    block.content = block.content.trim_end().to_string();
    validate_block(&block)?;

    let mut conn = state.conn();
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM notes WHERE id = ?1)",
            [&note_id],
            |row| row.get(0),
        )
        .map_err(db::error)?;
    if !exists {
        return Err("记录不存在或已被删除".to_string());
    }

    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM note_blocks WHERE note_id = ?1",
            [&note_id],
            |row| row.get(0),
        )
        .map_err(db::error)?;

    let tx = conn.transaction().map_err(db::error)?;
    insert_block(&tx, &note_id, &block, next_order)?;
    touch_note(&tx, &note_id)?;
    refresh_note_type(&tx, &note_id)?;
    tx.commit().map_err(db::error)?;

    db::load_note(&conn, &state.data_dir, &note_id)
}

#[tauri::command]
pub fn update_block(
    state: State<'_, Db>,
    block_id: String,
    content: String,
) -> Result<Note, String> {
    let mut conn = state.conn();
    let (note_id, block_type) = block_note_id(&conn, &block_id)?;
    if block_type == "image" {
        return Err("图片块不支持编辑文字".to_string());
    }

    let tx = conn.transaction().map_err(db::error)?;
    tx.execute(
        "UPDATE note_blocks SET content = ?1 WHERE id = ?2",
        params![content.trim_end(), block_id],
    )
    .map_err(db::error)?;
    touch_note(&tx, &note_id)?;
    refresh_note_type(&tx, &note_id)?;
    tx.commit().map_err(db::error)?;

    db::load_note(&conn, &state.data_dir, &note_id)
}

#[tauri::command]
pub fn delete_block(state: State<'_, Db>, block_id: String) -> Result<Note, String> {
    let mut conn = state.conn();
    let (note_id, _) = block_note_id(&conn, &block_id)?;

    let tx = conn.transaction().map_err(db::error)?;
    tx.execute("DELETE FROM note_blocks WHERE id = ?1", [&block_id])
        .map_err(db::error)?;
    touch_note(&tx, &note_id)?;
    refresh_note_type(&tx, &note_id)?;
    tx.commit().map_err(db::error)?;

    db::load_note(&conn, &state.data_dir, &note_id)
}

#[tauri::command]
pub fn toggle_block_completed(
    state: State<'_, Db>,
    block_id: String,
) -> Result<Note, String> {
    let conn = state.conn();
    let (note_id, _) = block_note_id(&conn, &block_id)?;

    let changed = conn
        .execute(
            "UPDATE note_blocks
             SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END
             WHERE id = ?1",
            [&block_id],
        )
        .map_err(db::error)?;
    if changed == 0 {
        return Err("内容块不存在或已被删除".to_string());
    }
    touch_note(&conn, &note_id)?;
    refresh_note_type(&conn, &note_id)?;

    db::load_note(&conn, &state.data_dir, &note_id)
}

#[tauri::command]
pub fn delete_note(state: State<'_, Db>, id: String) -> Result<(), String> {
    let mut conn = state.conn();

    let asset_ids: Vec<String> = {
        let mut stmt = conn
            .prepare(
                "SELECT DISTINCT asset_id FROM note_blocks
                 WHERE note_id = ?1 AND asset_id IS NOT NULL",
            )
            .map_err(db::error)?;
        let rows = stmt
            .query_map([&id], |row| row.get::<_, String>(0))
            .map_err(db::error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db::error)?
    };

    let tx = conn.transaction().map_err(db::error)?;
    let changed = tx
        .execute("DELETE FROM notes WHERE id = ?1", [&id])
        .map_err(db::error)?;
    if changed == 0 {
        return Err("记录不存在或已被删除".to_string());
    }
    tx.commit().map_err(db::error)?;

    for asset_id in asset_ids {
        let references: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM note_blocks WHERE asset_id = ?1",
                [&asset_id],
                |row| row.get(0),
            )
            .map_err(db::error)?;
        if references > 0 {
            continue;
        }

        let relative: Option<String> = conn
            .query_row(
                "SELECT relative_path FROM assets WHERE id = ?1",
                [&asset_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(db::error)?;

        conn.execute("DELETE FROM assets WHERE id = ?1", [&asset_id])
            .map_err(db::error)?;

        if let Some(relative) = relative {
            let _ = remove_asset_file(&state.data_dir, &relative);
        }
    }

    Ok(())
}

fn remove_asset_file(data_dir: &Path, relative_path: &str) -> std::io::Result<()> {
    std::fs::remove_file(data_dir.join(relative_path))
}
