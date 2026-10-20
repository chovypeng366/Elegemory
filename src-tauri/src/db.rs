use std::{
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};

use crate::models::{Asset, Note, NoteBlock};

const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../migrations/001_init.sql")),
    (2, include_str!("../migrations/002_whisper.sql")),
];

pub struct Db {
    conn: Mutex<Connection>,
    pub data_dir: PathBuf,
}

impl Db {
    pub fn initialize(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&data_dir)?;
        std::fs::create_dir_all(data_dir.join("assets"))?;

        let mut conn = Connection::open(data_dir.join("elegemory.db"))?;
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        migrate(&mut conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
            data_dir,
        })
    }

    pub fn conn(&self) -> MutexGuard<'_, Connection> {
        self.conn
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn();
        conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .optional()
        .map_err(error)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value, now_ms()],
        )
        .map_err(error)?;
        Ok(())
    }

    pub fn all_settings(&self) -> Result<Vec<(String, String)>, String> {
        let conn = self.conn();
        let mut stmt = conn
            .prepare("SELECT key, value FROM settings ORDER BY key")
            .map_err(error)?;
        let rows = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(error)
    }
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

pub fn error(err: impl std::fmt::Display) -> String {
    format!("数据库操作失败：{err}")
}

fn migrate(conn: &mut Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );",
    )?;

    for (version, sql) in MIGRATIONS {
        let applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
            [version],
            |row| row.get(0),
        )?;
        if applied {
            continue;
        }

        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
            params![version, now_ms()],
        )?;
        tx.commit()?;
    }

    Ok(())
}

struct NoteHead {
    id: String,
    note_type: String,
    title: String,
    created_at: i64,
    updated_at: i64,
    is_pinned: bool,
    is_favorite: bool,
    is_archived: bool,
}

fn map_head(row: &rusqlite::Row<'_>) -> rusqlite::Result<NoteHead> {
    Ok(NoteHead {
        id: row.get(0)?,
        note_type: row.get(1)?,
        title: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        is_pinned: row.get::<_, i64>(5)? != 0,
        is_favorite: row.get::<_, i64>(6)? != 0,
        is_archived: row.get::<_, i64>(7)? != 0,
    })
}

pub fn load_notes(conn: &Connection, data_dir: &Path) -> Result<Vec<Note>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, type, title, created_at, updated_at, is_pinned, is_favorite, is_archived
             FROM notes ORDER BY created_at DESC",
        )
        .map_err(error)?;

    let heads = stmt
        .query_map([], map_head)
        .map_err(error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error)?;

    heads
        .into_iter()
        .map(|head| assemble_note(conn, data_dir, head))
        .collect()
}

pub fn load_note(
    conn: &Connection,
    data_dir: &Path,
    note_id: &str,
) -> Result<Note, String> {
    let head = conn
        .query_row(
            "SELECT id, type, title, created_at, updated_at, is_pinned, is_favorite, is_archived
             FROM notes WHERE id = ?1",
            [note_id],
            map_head,
        )
        .optional()
        .map_err(error)?
        .ok_or_else(|| "记录不存在或已被删除".to_string())?;

    assemble_note(conn, data_dir, head)
}

fn assemble_note(conn: &Connection, data_dir: &Path, head: NoteHead) -> Result<Note, String> {
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.note_id, b.block_type, b.content, b.asset_id,
                    a.relative_path, a.mime_type, a.width, a.height, a.size_bytes,
                    b.sort_order, b.is_completed
             FROM note_blocks b
             LEFT JOIN assets a ON a.id = b.asset_id
             WHERE b.note_id = ?1
             ORDER BY b.sort_order ASC",
        )
        .map_err(error)?;

    let blocks = stmt
        .query_map([&head.id], |row| {
            let asset_id: Option<String> = row.get(4)?;
            let relative_path: Option<String> = row.get(5)?;

            let asset = match (&asset_id, relative_path) {
                (Some(asset_id), Some(relative_path)) => {
                    let width: i64 = row.get(7)?;
                    let height: i64 = row.get(8)?;
                    Some(Asset {
                        id: asset_id.clone(),
                        path: data_dir
                            .join(&relative_path)
                            .to_string_lossy()
                            .to_string(),
                        relative_path,
                        mime_type: row.get(6)?,
                        width: width.max(0) as u32,
                        height: height.max(0) as u32,
                        size_bytes: row.get(9)?,
                    })
                }
                _ => None,
            };

            Ok(NoteBlock {
                id: row.get(0)?,
                note_id: row.get(1)?,
                block_type: row.get(2)?,
                content: row.get(3)?,
                asset_id,
                asset,
                sort_order: row.get(10)?,
                is_completed: row.get::<_, i64>(11)? != 0,
            })
        })
        .map_err(error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(error)?;

    Ok(Note {
        id: head.id,
        note_type: head.note_type,
        title: head.title,
        created_at: head.created_at,
        updated_at: head.updated_at,
        is_pinned: head.is_pinned,
        is_favorite: head.is_favorite,
        is_archived: head.is_archived,
        blocks,
    })
}
