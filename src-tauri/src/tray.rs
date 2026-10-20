use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

use crate::commands::system::{show_board_impl, show_capture_impl};

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open-board", "打开记忆白板", true, None::<&str>)?;
    let capture = MenuItem::with_id(app, "quick-capture", "快速记录", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出 Elegemory", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &capture, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id("elegemory-tray")
        .tooltip("Elegemory")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-board" => show_board_impl(app),
            "quick-capture" => show_capture_impl(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_board_impl(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}
