mod commands;
mod db;
mod models;
mod tray;

use db::Db;
use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            commands::system::show_board_impl(app);
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        commands::system::toggle_capture_impl(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle().clone();
            let database = Db::initialize(&handle)?;
            let shortcut = database
                .get_setting("capture_shortcut")
                .ok()
                .flatten()
                .unwrap_or_else(|| commands::settings::DEFAULT_SHORTCUT.to_string());

            app.manage(database);
            commands::settings::register_startup_shortcut(&handle, &shortcut);
            tray::create(&handle)?;

            if let Some(capture) = handle.get_webview_window("capture") {
                let _ = capture.hide();
            }

            if let Some(main) = handle.get_webview_window("main") {
                let hide_target = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = hide_target.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::list_notes,
            commands::notes::create_note,
            commands::notes::set_note_title,
            commands::notes::set_note_favorite,
            commands::notes::set_note_pinned,
            commands::notes::set_note_archived,
            commands::notes::add_block,
            commands::notes::update_block,
            commands::notes::delete_block,
            commands::notes::toggle_block_completed,
            commands::notes::delete_note,
            commands::assets::save_image_asset,
            commands::assets::import_image_path,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::set_capture_shortcut,
            commands::settings::get_app_info,
            commands::system::show_capture,
            commands::system::hide_capture,
            commands::system::toggle_capture,
            commands::system::show_board,
            commands::system::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Elegemory");
}
