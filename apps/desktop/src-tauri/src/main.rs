#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dock_icon;

/// Before the `ai.hanzo.<app>` identifier scheme this app was `com.hanzo.team`.
/// WebKit keeps the sign-in session under the bundle identifier, so each
/// legacy directory is moved into place before the webview opens. A directory
/// that already exists under the new identifier is never touched.
#[cfg(target_os = "macos")]
fn migrate_legacy_data() {
    let Some(home) = std::env::var_os("HOME") else { return };
    let library = std::path::Path::new(&home).join("Library");
    for dir in ["WebKit", "Caches", "Application Support"] {
        let legacy = library.join(dir).join("com.hanzo.team");
        let current = library.join(dir).join("ai.hanzo.team");
        if legacy.is_dir() && !current.exists() {
            if let Err(e) = std::fs::rename(&legacy, &current) {
                eprintln!("could not move {legacy:?} to {current:?}: {e}");
            }
        }
    }
}

fn main() {
    #[cfg(target_os = "macos")]
    migrate_legacy_data();

    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            dock_icon::init(app.handle())?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            dock_icon::handle_menu_event(app, event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            dock_icon::get_dock_icon_mode,
            dock_icon::set_dock_icon_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hanzo Team desktop application");
}
