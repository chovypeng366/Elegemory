use base64::{engine::general_purpose::STANDARD, Engine as _};
use rusqlite::OptionalExtension;
use tauri::State;

use crate::db::{self, Db};

#[tauri::command]
pub fn get_asset_data_url(state: State<'_, Db>, asset_id: String) -> Result<String, String> {
    let (relative_path, mime_type): (String, String) = {
        let conn = state.conn();
        conn.query_row(
            "SELECT relative_path, mime_type FROM assets WHERE id = ?1",
            [&asset_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(db::error)?
        .ok_or_else(|| "图片资源不存在".to_string())?
    };

    let assets_root = state.data_dir.join("assets");
    let path = state.data_dir.join(&relative_path);
    if !path.starts_with(&assets_root) {
        return Err("图片路径不合法".to_string());
    }

    let bytes = std::fs::read(&path).map_err(|error| format!("读取图片失败：{error}"))?;
    Ok(format!(
        "data:{mime_type};base64,{}",
        STANDARD.encode(bytes)
    ))
}

#[tauri::command]
pub async fn save_png_data(
    data_url: String,
    file_name: String,
) -> Result<Option<String>, String> {
    let encoded = data_url
        .split_once(',')
        .map(|(_, value)| value)
        .ok_or_else(|| "图片数据格式不正确".to_string())?;
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|error| format!("图片数据解析失败：{error}"))?;

    let safe_name = file_name
        .replace(['/', '\\'], "-")
        .trim()
        .to_string();
    let safe_name = if safe_name.is_empty() {
        "Elegemory-Day-Canvas.png".to_string()
    } else {
        safe_name
    };

    let selected = tauri::async_runtime::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_title("保存 Day Canvas")
            .add_filter("PNG 图片", &["png"])
            .set_file_name(&safe_name)
            .save_file()
    })
    .await
    .map_err(|error| format!("无法打开保存对话框：{error}"))?;

    let Some(path) = selected else {
        return Ok(None);
    };

    std::fs::write(&path, bytes).map_err(|error| format!("保存 PNG 失败：{error}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}
