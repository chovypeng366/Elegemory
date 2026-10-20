use std::{fs, io::Cursor, path::Path};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::GenericImageView;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, Db};
use crate::models::{Asset, SaveImageInput};

const MAX_IMAGE_BYTES: usize = 40 * 1024 * 1024;

#[tauri::command]
pub fn save_image_asset(
    state: State<'_, Db>,
    input: SaveImageInput,
) -> Result<Asset, String> {
    let bytes = STANDARD
        .decode(input.bytes.as_bytes())
        .map_err(|_| "图片数据损坏，无法解码".to_string())?;
    store_image(&state, &bytes)
}

#[tauri::command]
pub fn import_image_path(state: State<'_, Db>, path: String) -> Result<Asset, String> {
    let source = Path::new(&path);
    if !source.is_file() {
        return Err(format!("找不到图片文件：{path}"));
    }

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp") {
        return Err("仅支持 PNG / JPEG / WebP 图片".to_string());
    }

    let metadata = fs::metadata(source).map_err(|e| format!("读取图片失败：{e}"))?;
    if metadata.len() as usize > MAX_IMAGE_BYTES {
        return Err("图片超过 40 MB，暂不支持".to_string());
    }

    let bytes = fs::read(source).map_err(|e| format!("读取图片失败：{e}"))?;
    store_image(&state, &bytes)
}

fn store_image(db: &Db, bytes: &[u8]) -> Result<Asset, String> {
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err("图片超过 40 MB，暂不支持".to_string());
    }

    let decoded = image::load_from_memory(bytes)
        .map_err(|_| "无法识别的图片格式（支持 PNG / JPEG / WebP）".to_string())?;
    let (width, height) = decoded.dimensions();
    if width == 0 || height == 0 {
        return Err("图片尺寸无效".to_string());
    }
    if width as u64 * height as u64 > 40_000_000 {
        return Err("图片尺寸过大（超过 4000 万像素），暂不支持".to_string());
    }

    let rgba = image::DynamicImage::ImageRgba8(decoded.to_rgba8());
    let mut png = Vec::new();
    rgba.write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
        .map_err(|e| format!("图片编码失败：{e}"))?;

    let id = Uuid::new_v4().to_string();
    let relative_path = format!("assets/{id}.png");
    let absolute_path = db.data_dir.join(&relative_path);

    fs::create_dir_all(db.data_dir.join("assets"))
        .map_err(|e| format!("创建图片目录失败：{e}"))?;
    fs::write(&absolute_path, &png).map_err(|e| format!("写入图片失败：{e}"))?;

    let size_bytes = png.len() as i64;
    let now = db::now_ms();

    {
        let conn = db.conn();
        if let Err(err) = conn.execute(
            "INSERT INTO assets
                (id, relative_path, mime_type, width, height, size_bytes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &id,
                &relative_path,
                "image/png",
                width as i64,
                height as i64,
                size_bytes,
                now
            ],
        ) {
            drop(conn);
            let _ = fs::remove_file(&absolute_path);
            return Err(format!("保存图片记录失败：{err}"));
        }
    }

    Ok(Asset {
        id,
        path: absolute_path.to_string_lossy().to_string(),
        relative_path,
        mime_type: "image/png".to_string(),
        width,
        height,
        size_bytes,
    })
}
