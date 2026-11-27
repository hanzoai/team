use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime};

#[cfg(target_os = "macos")]
use tauri::menu::{CheckMenuItem, Menu, PredefinedMenuItem, Submenu};

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub const ICON_BRANDED_PNG: &[u8] = include_bytes!("../icons/icon-macos.png");
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub const ICON_MINIMAL_PNG: &[u8] = include_bytes!("../icons/icon-macos-minimal.png");

pub const CONFIG_FILE_NAME: &str = "dock-icon-mode.json";
pub const MENU_ID_BRANDED: &str = "dock_icon_branded";
pub const MENU_ID_MINIMAL: &str = "dock_icon_minimal";
pub const EVENT_DOCK_ICON_MODE_CHANGED: &str = "dock-icon-mode-changed";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DockIconMode {
    #[default]
    Branded,
    Minimal,
}

impl DockIconMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Branded => "branded",
            Self::Minimal => "minimal",
        }
    }

    pub fn parse(input: &str) -> Result<Self, String> {
        match input.trim().to_ascii_lowercase().as_str() {
            "branded" => Ok(Self::Branded),
            "minimal" => Ok(Self::Minimal),
            other => Err(format!(
                "invalid dock icon mode '{other}': expected 'branded' or 'minimal'"
            )),
        }
    }

    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    pub fn png_bytes(self) -> &'static [u8] {
        match self {
            Self::Branded => ICON_BRANDED_PNG,
            Self::Minimal => ICON_MINIMAL_PNG,
        }
    }
}

impl fmt::Display for DockIconMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for DockIconMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DockIconConfig {
    mode: DockIconMode,
}

pub fn read_mode_from_path(path: &Path) -> DockIconMode {
    let Ok(raw) = fs::read_to_string(path) else {
        return DockIconMode::default();
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return DockIconMode::default();
    }
    if let Ok(cfg) = serde_json::from_str::<DockIconConfig>(trimmed) {
        return cfg.mode;
    }
    if let Ok(mode) = serde_json::from_str::<DockIconMode>(trimmed) {
        return mode;
    }
    DockIconMode::parse(trimmed).unwrap_or_default()
}

pub fn write_mode_to_path(path: &Path, mode: DockIconMode) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create config dir '{}': {e}", parent.display()))?;
    }
    let payload = serde_json::to_string_pretty(&DockIconConfig { mode })
        .map_err(|e| format!("failed to serialize dock icon mode: {e}"))?;
    fs::write(path, format!("{payload}\n"))
        .map_err(|e| format!("failed to write '{}': {e}", path.display()))
}

fn config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|dir| dir.join(CONFIG_FILE_NAME))
        .map_err(|e| format!("failed to resolve app config dir: {e}"))
}

pub fn load_mode<R: Runtime>(app: &AppHandle<R>) -> DockIconMode {
    match config_path(app) {
        Ok(path) => read_mode_from_path(&path),
        Err(_) => DockIconMode::default(),
    }
}

pub fn save_mode<R: Runtime>(app: &AppHandle<R>, mode: DockIconMode) -> Result<(), String> {
    let path = config_path(app)?;
    write_mode_to_path(&path, mode)
}

#[cfg(target_os = "macos")]
pub struct DockIconMenuState<R: Runtime> {
    branded: CheckMenuItem<R>,
    minimal: CheckMenuItem<R>,
}

#[cfg(target_os = "macos")]
impl<R: Runtime> DockIconMenuState<R> {
    fn sync(&self, mode: DockIconMode) {
        let _ = self.branded.set_checked(mode == DockIconMode::Branded);
        let _ = self.minimal.set_checked(mode == DockIconMode::Minimal);
    }
}

#[cfg(target_os = "macos")]
fn apply_dock_icon_main_thread(
    mtm: objc2::MainThreadMarker,
    mode: DockIconMode,
) -> Result<(), String> {
    use objc2::AnyThread;
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let data = NSData::with_bytes(mode.png_bytes());
    let image = NSImage::initWithData(NSImage::alloc(), &data)
        .ok_or_else(|| "failed to decode dock icon PNG into NSImage".to_string())?;
    let ns_app = NSApplication::sharedApplication(mtm);
    // SAFETY: `image` is a valid non-null NSImage and `ns_app` is accessed on the main thread.
    unsafe {
        ns_app.setApplicationIconImage(Some(&image));
    }
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn apply_mode<R: Runtime>(app: &AppHandle<R>, mode: DockIconMode) -> Result<(), String> {
    if let Some(mtm) = objc2::MainThreadMarker::new() {
        return apply_dock_icon_main_thread(mtm, mode);
    }

    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let result = objc2::MainThreadMarker::new()
            .ok_or_else(|| "NSApplication must be updated on the main thread".to_string())
            .and_then(|mtm| apply_dock_icon_main_thread(mtm, mode));
        let _ = tx.send(result);
    })
    .map_err(|e| format!("failed to dispatch dock icon update to main thread: {e}"))?;

    rx.recv()
        .map_err(|e| format!("failed to receive dock icon update result: {e}"))?
}

#[cfg(not(target_os = "macos"))]
pub fn apply_mode<R: Runtime>(_app: &AppHandle<R>, _mode: DockIconMode) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
fn install_macos_menu<R: Runtime>(
    app: &AppHandle<R>,
    initial_mode: DockIconMode,
) -> tauri::Result<()> {
    let menu = Menu::default(app)?;
    let branded_item = CheckMenuItem::with_id(
        app,
        MENU_ID_BRANDED,
        "Branded (H badge)",
        true,
        initial_mode == DockIconMode::Branded,
        None::<&str>,
    )?;
    let minimal_item = CheckMenuItem::with_id(
        app,
        MENU_ID_MINIMAL,
        "Minimal (No badge)",
        true,
        initial_mode == DockIconMode::Minimal,
        None::<&str>,
    )?;
    let dock_submenu =
        Submenu::with_items(app, "Dock Icon", true, &[&branded_item, &minimal_item])?;

    if let Some(first_item) = menu.items()?.into_iter().next() {
        if let Some(app_submenu) = first_item.as_submenu() {
            let separator = PredefinedMenuItem::separator(app)?;
            app_submenu.insert_items(&[&dock_submenu, &separator], 2)?;
        }
    }

    app.manage(DockIconMenuState {
        branded: branded_item,
        minimal: minimal_item,
    });
    app.set_menu(menu)?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn install_macos_menu<R: Runtime>(
    _app: &AppHandle<R>,
    _initial_mode: DockIconMode,
) -> tauri::Result<()> {
    Ok(())
}

pub fn set_and_apply_mode<R: Runtime>(
    app: &AppHandle<R>,
    mode: DockIconMode,
) -> Result<DockIconMode, String> {
    apply_mode(app, mode)?;
    save_mode(app, mode)?;
    #[cfg(target_os = "macos")]
    if let Some(state) = app.try_state::<DockIconMenuState<R>>() {
        state.sync(mode);
    }
    let _ = app.emit(EVENT_DOCK_ICON_MODE_CHANGED, mode.as_str());
    Ok(mode)
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let mode = load_mode(app);
    if let Err(err) = apply_mode(app, mode) {
        eprintln!("warning: failed to apply saved dock icon mode '{mode}': {err}");
    }
    install_macos_menu(app, mode)?;
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event_id: &str) -> bool {
    let mode = match event_id {
        MENU_ID_BRANDED => DockIconMode::Branded,
        MENU_ID_MINIMAL => DockIconMode::Minimal,
        _ => return false,
    };
    if let Err(err) = set_and_apply_mode(app, mode) {
        eprintln!("warning: failed to switch dock icon mode to '{mode}': {err}");
    }
    true
}

#[tauri::command]
pub fn get_dock_icon_mode<R: Runtime>(app: AppHandle<R>) -> String {
    load_mode(&app).as_str().to_string()
}

#[tauri::command]
pub fn set_dock_icon_mode<R: Runtime>(app: AppHandle<R>, mode: String) -> Result<String, String> {
    let parsed = DockIconMode::parse(&mode)?;
    let applied = set_and_apply_mode(&app, parsed)?;
    Ok(applied.as_str().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_config_path(test_name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock after epoch")
            .as_nanos();
        std::env::temp_dir()
            .join(format!("hanzo-team-dock-icon-{test_name}-{nanos}"))
            .join(CONFIG_FILE_NAME)
    }

    #[test]
    fn embedded_pngs_are_valid() {
        const PNG_SIGNATURE: &[u8] = b"\x89PNG\r\n\x1a\n";
        assert!(ICON_BRANDED_PNG.starts_with(PNG_SIGNATURE));
        assert!(ICON_MINIMAL_PNG.starts_with(PNG_SIGNATURE));
        assert_eq!(DockIconMode::Branded.png_bytes(), ICON_BRANDED_PNG);
        assert_eq!(DockIconMode::Minimal.png_bytes(), ICON_MINIMAL_PNG);
    }

    #[test]
    fn parse_accepts_valid_modes_and_rejects_unknown() {
        assert_eq!(DockIconMode::default(), DockIconMode::Branded);
        assert_eq!(
            DockIconMode::parse("branded").unwrap(),
            DockIconMode::Branded
        );
        assert_eq!(
            DockIconMode::parse("minimal").unwrap(),
            DockIconMode::Minimal
        );
        assert_eq!(
            DockIconMode::parse("  MINIMAL \n").unwrap(),
            DockIconMode::Minimal
        );
        assert_eq!(
            "branded".parse::<DockIconMode>().unwrap(),
            DockIconMode::Branded
        );
        assert_eq!(DockIconMode::Branded.as_str(), "branded");
        assert_eq!(DockIconMode::Minimal.as_str(), "minimal");
        assert!(DockIconMode::parse("").is_err());
        assert!(DockIconMode::parse("classic").is_err());
    }

    #[test]
    fn persistence_round_trips_and_handles_missing_or_corrupt_files() {
        let path = temp_config_path("roundtrip");
        let dir = path.parent().unwrap().to_path_buf();

        // Missing file defaults to branded.
        assert_eq!(read_mode_from_path(&path), DockIconMode::Branded);

        // Save minimal and read back.
        write_mode_to_path(&path, DockIconMode::Minimal).unwrap();
        assert_eq!(read_mode_from_path(&path), DockIconMode::Minimal);

        // Save branded and read back.
        write_mode_to_path(&path, DockIconMode::Branded).unwrap();
        assert_eq!(read_mode_from_path(&path), DockIconMode::Branded);

        // Bare JSON string format is also accepted.
        fs::write(&path, "\"minimal\"").unwrap();
        assert_eq!(read_mode_from_path(&path), DockIconMode::Minimal);

        // Corrupt JSON falls back safely to branded.
        fs::write(&path, "{not valid json").unwrap();
        assert_eq!(read_mode_from_path(&path), DockIconMode::Branded);

        let _ = fs::remove_dir_all(&dir);
    }
}
