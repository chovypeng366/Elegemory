use std::sync::Mutex;

use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, State, WebviewUrl,
    WebviewWindowBuilder,
};

const MAX_PINNED: usize = 6;
const CARD_WINDOW_WIDTH: f64 = 252.0;
const CARD_WINDOW_HEIGHT: f64 = 380.0;
const CARD_MIN_WIDTH: f64 = 232.0;
const CARD_MIN_HEIGHT: f64 = 300.0;
const CARD_MAX_WIDTH: f64 = 620.0;
const CARD_MAX_HEIGHT: f64 = 900.0;
const CARD_GAP: f64 = 16.0;
const SCREEN_MARGIN: f64 = 16.0;
const LINE_HEIGHT: f64 = 48.0;
const CARD_LABEL_PREFIX: &str = "pin-";
const LINE_LABEL: &str = "pin-line";

#[derive(Default)]
pub struct PinnedNote(pub Mutex<Vec<String>>);

fn lock_pinned(state: &PinnedNote) -> std::sync::MutexGuard<'_, Vec<String>> {
    state
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn card_label(note_id: &str) -> String {
    format!("{CARD_LABEL_PREFIX}{note_id}")
}

fn active_monitor(app: &AppHandle) -> Result<Monitor, String> {
    app.get_webview_window("main")
        .and_then(|window| window.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or_else(|| "无法读取屏幕信息".to_string())
}

fn place_line(app: &AppHandle, monitor: &Monitor) -> Result<(), String> {
    let line = app
        .get_webview_window(LINE_LABEL)
        .ok_or_else(|| "悬挂细线窗口不可用".to_string())?;
    let scale = monitor.scale_factor();
    let width = monitor.size().width as f64 / scale;
    let visible = line.is_visible().unwrap_or(false);

    line.set_size(LogicalSize::new(width, LINE_HEIGHT))
        .map_err(|error| format!("设置悬挂细线尺寸失败：{error}"))?;
    line.set_position(PhysicalPosition::new(
        monitor.position().x,
        monitor.position().y,
    ))
    .map_err(|error| format!("定位悬挂细线失败：{error}"))?;

    if !visible {
        line.show()
            .map_err(|error| format!("显示悬挂细线失败：{error}"))?;
        let _ = line.set_ignore_cursor_events(true);
    }
    Ok(())
}

fn next_card_x(monitor: &Monitor, index: usize) -> i32 {
    let scale = monitor.scale_factor();
    let width = (CARD_WINDOW_WIDTH * scale).round() as i32;
    let gap = (CARD_GAP * scale).round() as i32;
    let margin = (SCREEN_MARGIN * scale).round() as i32;
    let left = monitor.position().x + margin;
    let right = monitor.position().x + monitor.size().width as i32 - width - margin;
    let step = width + gap;
    let span = (right - left).max(1);
    left + ((index as i32 * step) % span)
}

#[tauri::command]
pub async fn pin_note_to_top(
    app: AppHandle,
    state: State<'_, PinnedNote>,
    note_id: String,
) -> Result<(), String> {
    let monitor = active_monitor(&app)?;
    let label = card_label(&note_id);

    if lock_pinned(&state).contains(&note_id) {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.show();
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.set_focus();
            }
        }
        return Ok(());
    }

    let pinned_count = {
        let pinned = lock_pinned(&state);
        if pinned.len() >= MAX_PINNED {
            return Err(format!("最多同时悬挂 {MAX_PINNED} 条记忆，请先取下一条"));
        }
        pinned.len()
    };

    let x = next_card_x(&monitor, pinned_count);
    let card = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("Elegemory")
        .inner_size(CARD_WINDOW_WIDTH, CARD_WINDOW_HEIGHT)
        .min_inner_size(CARD_MIN_WIDTH, CARD_MIN_HEIGHT)
        .max_inner_size(CARD_MAX_WIDTH, CARD_MAX_HEIGHT)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .visible(false)
        .skip_taskbar(true)
        .shadow(false)
        .build()
        .map_err(|error| format!("创建悬挂卡片失败：{error}"))?;

    card.set_position(PhysicalPosition::new(x, monitor.position().y))
        .map_err(|error| format!("定位悬挂卡片失败：{error}"))?;

    place_line(&app, &monitor)?;
    card.show()
        .map_err(|error| format!("显示悬挂卡片失败：{error}"))?;
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }

    {
        let mut pinned = lock_pinned(&state);
        if !pinned.contains(&note_id) {
            pinned.push(note_id.clone());
        }
    }

    app.emit("pin-note", note_id)
        .map_err(|error| format!("通知悬挂窗口失败：{error}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_pinned_note_ids(state: State<'_, PinnedNote>) -> Vec<String> {
    lock_pinned(&state).clone()
}

#[tauri::command]
pub async fn unpin_note(
    app: AppHandle,
    state: State<'_, PinnedNote>,
    note_id: String,
) -> Result<Vec<String>, String> {
    if let Some(card) = app.get_webview_window(&card_label(&note_id)) {
        let _ = card.close();
    }

    let remaining = {
        let mut pinned = lock_pinned(&state);
        pinned.retain(|id| id != &note_id);
        pinned.clone()
    };

    if remaining.is_empty() {
        if let Some(line) = app.get_webview_window(LINE_LABEL) {
            let _ = line.hide();
        }
    }

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }

    app.emit("unpin-note", note_id)
        .map_err(|error| format!("返回主窗口失败：{error}"))?;
    Ok(remaining)
}
