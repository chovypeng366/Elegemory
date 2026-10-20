use tauri::{AppHandle, Emitter, Manager};

pub fn show_capture_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("capture") {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("capture-shown", ());
    }
}

pub fn hide_capture_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("capture") {
        let _ = window.hide();
    }
}

pub fn toggle_capture_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("capture") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
            return;
        }

        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("capture-shown", ());
    }
}

pub fn show_board_impl(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn show_capture(app: AppHandle) {
    show_capture_impl(&app);
}

#[tauri::command]
pub fn hide_capture(app: AppHandle) {
    hide_capture_impl(&app);
}

#[tauri::command]
pub fn toggle_capture(app: AppHandle) {
    toggle_capture_impl(&app);
}

#[tauri::command]
pub fn show_board(app: AppHandle) {
    show_board_impl(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
