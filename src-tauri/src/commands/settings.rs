use std::{collections::BTreeMap, str::FromStr};

use tauri::{AppHandle, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::db::Db;
use crate::models::AppInfo;

pub const DEFAULT_SHORTCUT: &str = "Ctrl+Shift+Space";

fn validate_shortcut_text(input: &str) -> Result<(), String> {
    let compact = input
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>()
        .to_ascii_lowercase();

    let has_modifier = compact
        .split('+')
        .any(|part| matches!(part, "ctrl" | "control" | "alt" | "shift" | "super" | "cmd" | "command"));

    if !has_modifier {
        return Err("快捷键至少需要 Ctrl / Alt / Shift 中的一个修饰键".to_string());
    }

    if matches!(
        compact.as_str(),
        "ctrl+c"
            | "control+c"
            | "ctrl+v"
            | "control+v"
            | "cmd+c"
            | "command+c"
            | "cmd+v"
            | "command+v"
            | "cmdorctrl+c"
            | "cmdorcontrol+c"
            | "cmdorctrl+v"
            | "cmdorcontrol+v"
    ) {
        return Err("不能占用 Ctrl+C / Ctrl+V 等系统复制粘贴快捷键".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<'_, Db>) -> Result<BTreeMap<String, String>, String> {
    let pairs = state.all_settings()?;
    Ok(pairs.into_iter().collect())
}

#[tauri::command]
pub fn set_setting(state: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() || key.len() > 64 {
        return Err("设置项名称不合法".to_string());
    }
    if value.len() > 4096 {
        return Err("设置内容过长".to_string());
    }
    state.set_setting(key, &value)
}

#[tauri::command]
pub fn set_capture_shortcut(
    app: AppHandle,
    state: State<'_, Db>,
    shortcut: String,
) -> Result<String, String> {
    let candidate = shortcut.trim();
    if candidate.is_empty() {
        return Err("快捷键不能为空".to_string());
    }
    validate_shortcut_text(candidate)?;

    let parsed = Shortcut::from_str(candidate)
        .map_err(|err| format!("无法识别快捷键「{candidate}」：{err}"))?;
    let normalized = candidate.to_string();
    let previous = state
        .get_setting("capture_shortcut")?
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string());

    app.global_shortcut()
        .unregister_all()
        .map_err(|err| format!("更新快捷键失败：{err}"))?;

    if let Err(err) = app.global_shortcut().register(parsed) {
        if let Ok(previous_shortcut) = Shortcut::from_str(&previous) {
            let _ = app.global_shortcut().register(previous_shortcut);
        }
        return Err(format!(
            "快捷键 {normalized} 注册失败，可能已被其他程序占用：{err}"
        ));
    }

    state.set_setting("capture_shortcut", &normalized)?;
    Ok(normalized)
}

#[tauri::command]
pub fn get_app_info(state: State<'_, Db>) -> Result<AppInfo, String> {
    let conn = state.conn();
    let note_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
        .map_err(crate::db::error)?;
    let archived_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE is_archived = 1",
            [],
            |row| row.get(0),
        )
        .map_err(crate::db::error)?;
    let asset_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM assets", [], |row| row.get(0))
        .map_err(crate::db::error)?;

    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        data_dir: state.data_dir.to_string_lossy().to_string(),
        db_path: state
            .data_dir
            .join("elegemory.db")
            .to_string_lossy()
            .to_string(),
        note_count,
        archived_count,
        asset_count,
    })
}

pub fn register_startup_shortcut(app: &AppHandle, spec: &str) {
    if let Err(reason) = validate_shortcut_text(spec) {
        eprintln!("全局快捷键配置无效 {spec}：{reason}");
        return;
    }

    match Shortcut::from_str(spec) {
        Ok(shortcut) => {
            if let Err(err) = app.global_shortcut().register(shortcut) {
                eprintln!("无法注册全局快捷键 {spec}：{err}");
            }
        }
        Err(err) => eprintln!("全局快捷键配置无效 {spec}：{err}"),
    }
}
