use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State};

#[derive(Default)]
pub struct PinnedNote(pub Mutex<Option<String>>);

fn lock_pinned(state: &PinnedNote) -> std::sync::MutexGuard<'_, Option<String>> {
    state
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[tauri::command]
pub fn pin_note_to_top(
    app: AppHandle,
    state: State<'_, PinnedNote>,
    note_id: String,
) -> Result<(), String> {
    let pin = app
        .get_webview_window("pin")
        .ok_or_else(|| "悬挂窗口不可用".to_string())?;

    let monitor = app
        .get_webview_window("main")
        .and_then(|window| window.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or_else(|| "无法读取屏幕信息".to_string())?;

    let physical_width = pin
        .outer_size()
        .map_err(|error| format!("读取悬挂窗口尺寸失败：{error}"))?
        .width as i32;
    let x = monitor.position().x + (monitor.size().width as i32 - physical_width) / 2;
    let y = monitor.position().y;
    pin.set_position(PhysicalPosition::new(x, y))
        .map_err(|error| format!("定位悬挂窗口失败：{error}"))?;

    pin.show()
        .map_err(|error| format!("显示悬挂窗口失败：{error}"))?;
    let _ = pin.set_always_on_top(true);
    let _ = pin.set_focus();

    *lock_pinned(&state) = Some(note_id.clone());
    app.emit("pin-note", note_id)
        .map_err(|error| format!("通知悬挂窗口失败：{error}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_pinned_note_id(state: State<'_, PinnedNote>) -> Option<String> {
    lock_pinned(&state).clone()
}

#[tauri::command]
pub fn unpin_note(app: AppHandle, state: State<'_, PinnedNote>) -> Result<(), String> {
    let note_id = lock_pinned(&state).take();

    if let Some(pin) = app.get_webview_window("pin") {
        pin.hide()
            .map_err(|error| format!("隐藏悬挂窗口失败：{error}"))?;
    }

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }

    if let Some(note_id) = note_id {
        app.emit("unpin-note", note_id)
            .map_err(|error| format!("返回主窗口失败：{error}"))?;
    }
    Ok(())
}
