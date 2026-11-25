#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dock_icon;
mod hanzod;

use tauri::{WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
async fn team_hanzod_status() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(hanzod::status)
        .await
        .map_err(|e| format!("hanzod status join error: {e}"))?
}

#[tauri::command]
async fn team_hanzod_worker() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(hanzod::worker_status)
        .await
        .map_err(|e| format!("hanzod worker join error: {e}"))?
}

#[tauri::command]
async fn team_hanzod_cluster_up(mode: Option<String>) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || hanzod::cluster_up(mode))
        .await
        .map_err(|e| format!("hanzod cluster_up join error: {e}"))?
}

#[tauri::command]
async fn team_hanzod_cluster_down() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(hanzod::cluster_down)
        .await
        .map_err(|e| format!("hanzod cluster_down join error: {e}"))?
}

/// Before the `ai.hanzo.<app>` identifier scheme this app was `com.hanzo.team`.
/// WebKit keeps the sign-in session under the bundle identifier, so each
/// legacy directory is moved into place before the webview opens.
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

#[cfg(target_os = "windows")]
fn apply_windows_dwm_chrome(window: &tauri::WebviewWindow) {
    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(
            hwnd: *mut std::ffi::c_void,
            dw_attribute: u32,
            pv_attribute: *const std::ffi::c_void,
            cb_attribute: u32,
        ) -> i32;
    }
    const DWMWA_USE_IMMERSIVE_DARK_MODE: u32 = 20;
    const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
    const DWMWCP_ROUND: u32 = 2;

    if let Ok(hwnd) = window.hwnd() {
        let raw = hwnd.0 as *mut std::ffi::c_void;
        let dark: u32 = 1;
        let corner: u32 = DWMWCP_ROUND;
        unsafe {
            let _ = DwmSetWindowAttribute(
                raw,
                DWMWA_USE_IMMERSIVE_DARK_MODE,
                &dark as *const u32 as *const std::ffi::c_void,
                std::mem::size_of::<u32>() as u32,
            );
            let _ = DwmSetWindowAttribute(
                raw,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &corner as *const u32 as *const std::ffi::c_void,
                std::mem::size_of::<u32>() as u32,
            );
        }
    }
}

#[tauri::command]
fn team_set_window_mode(window: tauri::WebviewWindow, mode: String) -> Result<(), String> {
    if mode == "login" {
        let _ = window.set_min_size(Some(tauri::LogicalSize::new(400.0, 560.0)));
        window
            .set_size(tauri::LogicalSize::new(460.0, 640.0))
            .map_err(|e| e.to_string())?;
        let _ = window.center();
    } else {
        let _ = window.set_min_size(Some(tauri::LogicalSize::new(900.0, 600.0)));
        window
            .set_size(tauri::LogicalSize::new(1360.0, 860.0))
            .map_err(|e| e.to_string())?;
        let _ = window.center();
    }
    Ok(())
}

/// Cross-platform frameless window chrome script injected on local & remote Hanzo origins.
/// Ensures `[data-slot="masthead"]` and `[data-slot="title-bar"]` drag/toggle-maximize cleanly,
/// keeps menus solid `#121214` without backdrop blur, hides duplicate window controls on macOS,
/// and mounts crisp `28x28` monochrome `- □ ×` `[data-slot="window-controls"]` on Linux/Windows
/// whenever a remote page (e.g. `hanzo.ai/login`) has not mounted its own.
const HANZO_SHELL_CHROME_SCRIPT: &str = r##"(function () {
  if (typeof window === 'undefined' || window.__HANZO_TEAM_SHELL_CHROME__) return;
  window.__HANZO_TEAM_SHELL_CHROME__ = true;

  var isMac = typeof navigator !== 'undefined' && /Mac|Darwin/i.test(navigator.platform || navigator.userAgent);
  var isLinux = !isMac && typeof navigator !== 'undefined' && /Linux/i.test(navigator.platform || navigator.userAgent);
  var STYLE_ID = 'hanzo-team-frameless-chrome';
  var lastMode = null;

  function invokeCore(cmd, args) {
    var w = window;
    if (w.__TAURI_INTERNALS__ && typeof w.__TAURI_INTERNALS__.invoke === 'function') {
      return w.__TAURI_INTERNALS__.invoke(cmd, args || {});
    }
    if (w.__TAURI__ && w.__TAURI__.core && typeof w.__TAURI__.core.invoke === 'function') {
      return w.__TAURI__.core.invoke(cmd, args || {});
    }
    return Promise.resolve(null);
  }

  function invokeWin(cmd) {
    var w = window;
    var win = w.__TAURI__ && w.__TAURI__.window && w.__TAURI__.window.getCurrentWindow
      ? w.__TAURI__.window.getCurrentWindow()
      : null;
    var label = (win && win.label) ||
      (w.__TAURI_INTERNALS__ && w.__TAURI_INTERNALS__.metadata && w.__TAURI_INTERNALS__.metadata.currentWindow && w.__TAURI_INTERNALS__.metadata.currentWindow.label) ||
      'main';
    return invokeCore('plugin:window|' + cmd, { label: label });
  }

  function syncMaximized() {
    Promise.resolve(invokeWin('is_maximized')).then(function (v) {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-maximized', v ? 'true' : 'false');
      }
    }).catch(function () {});
  }

  var CSS = [
    ':root, html.dark, [data-theme="dark"] {',
    '  --hanzo-menu-bg: #121214; --hanzo-menu-fg: #fafafa; --hanzo-menu-muted: #a1a1aa;',
    '  --hanzo-menu-hover: rgba(255, 255, 255, 0.08); --hanzo-menu-border: rgba(255, 255, 255, 0.12);',
    '  --hanzo-menu-shadow: rgba(0, 0, 0, 0.72);',
    '}',
    'html.light, [data-theme="light"] {',
    '  --hanzo-menu-bg: #ffffff; --hanzo-menu-fg: #09090b; --hanzo-menu-muted: #52525b;',
    '  --hanzo-menu-hover: rgba(0, 0, 0, 0.06); --hanzo-menu-border: rgba(0, 0, 0, 0.10);',
    '  --hanzo-menu-shadow: rgba(0, 0, 0, 0.14);',
    '}',
    '[role="menu"], [data-slot="desktop-app-menu"], [data-slot="dropdown-menu-content"], [data-slot="popover-content"] {',
    '  background-color: var(--hanzo-menu-bg, #121214) !important;',
    '  backdrop-filter: none !important;',
    '  -webkit-backdrop-filter: none !important;',
    '}',
    'header[data-slot="masthead"] [data-slot="wordmark"] { display: none !important; }',
    '[data-slot="title-bar"], [data-testid="hanzo-business-header"] { border-bottom: none !important; }',
    '[data-testid="hanzo-business-header"] > div:nth-child(2) > div:first-child { visibility: hidden !important; pointer-events: none !important; }',
    isLinux ? 'html { background: transparent !important; }' : '',
    isLinux ? 'html:not([data-maximized="true"]) body { border-radius: 12px !important; overflow: hidden !important; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.10); }' : '',
    isLinux ? 'html.light:not([data-maximized="true"]) body { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }' : '',
    isLinux ? '@media (max-width: 640px) { html:not([data-maximized="true"]) body { border-radius: 24px !important; } }' : '',
    isLinux ? 'html[data-window-mode="login"]:not([data-maximized="true"]) body { border-radius: 24px !important; }' : '',
    isLinux ? 'html[data-maximized="true"] body { border-radius: 0 !important; box-shadow: none !important; }' : '',
    isMac ? '[data-slot="window-controls"] { display: none !important; }' : '',
    '.hz-injected-win-ctrls {',
    '  display: inline-flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; user-select: none; z-index: 2147483640;',
    '}',
    '.hz-injected-win-btn {',
    '  width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--hanzo-menu-muted, #a1a1aa);',
    '  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;',
    '  transition: background-color 0.14s ease, color 0.14s ease;',
    '}',
    '.hz-injected-win-btn:hover { background: var(--hanzo-menu-hover, rgba(255,255,255,0.08)); color: var(--hanzo-menu-fg, #fafafa); }',
    '.hz-injected-win-btn[data-action="close"]:hover { background: #e5484d; color: #ffffff; }'
  ].join('\n');

  function ensureChrome() {
    var docEl = document.documentElement;
    if (!docEl) return;
    docEl.setAttribute('data-desktop', 'true');
    var root = document.head || docEl;
    if (root && !document.getElementById(STYLE_ID)) {
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      root.appendChild(style);
    }
    var hasWorkspace = Boolean(document.querySelector('[data-testid="hanzo-business-header"], [data-slot="title-bar"]'));
    var hasMasthead = !hasWorkspace && Boolean(document.querySelector('[data-slot="masthead"], [data-slot="desktop-signin"], [data-slot="signin"]'));
    var desiredMode = hasWorkspace ? 'workspace' : (hasMasthead ? 'login' : null);
    if (desiredMode && desiredMode !== lastMode) {
      lastMode = desiredMode;
      docEl.setAttribute('data-window-mode', desiredMode);
      invokeCore('team_set_window_mode', { mode: desiredMode });
    }
    if (isMac) return;

    var bar = document.querySelector('[data-slot="title-bar"], [data-slot="masthead"], [data-testid="hanzo-business-header"]');
    if (!bar) return;
    var existing = document.querySelectorAll('[data-slot="window-controls"]');
    if (existing.length > 0) return;

    var wrap = document.createElement('div');
    wrap.setAttribute('data-slot', 'window-controls');
    wrap.setAttribute('data-tauri-drag-region', 'false');
    wrap.className = 'hz-injected-win-ctrls';
    wrap.innerHTML =
      '<button type="button" class="hz-injected-win-btn" data-action="min" data-tauri-drag-region="false" aria-label="Minimize">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="6" x2="10" y2="6" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<button type="button" class="hz-injected-win-btn" data-action="max" data-tauri-drag-region="false" aria-label="Maximize">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>' +
      '</button>' +
      '<button type="button" class="hz-injected-win-btn" data-action="close" data-tauri-drag-region="false" aria-label="Close">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke-linecap="round"/><line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke-linecap="round"/></svg>' +
      '</button>';
    wrap.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    wrap.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action]') : null;
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      var act = btn.getAttribute('data-action');
      if (act === 'min') invokeWin('minimize');
      else if (act === 'max') invokeWin('toggle_maximize');
      else if (act === 'close') invokeWin('close');
    });
    bar.appendChild(wrap);
  }

  var INTERACTIVE = 'button, input, select, textarea, label, summary, a:not([data-tauri-drag-region]), [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="combobox"], [aria-haspopup], [contenteditable="true"], [data-tauri-drag-region="false"], [data-slot="window-controls"], [data-slot="desktop-app-menu"], [data-slot="desktop-app-menu-trigger"]';

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || !e.target || typeof e.target.closest !== 'function') return;
    if (!e.target.closest('[data-slot="masthead"], [data-slot="title-bar"], [data-tauri-drag-region], [data-testid="hanzo-business-header"]')) return;
    if (e.target.closest(INTERACTIVE)) return;
    if (e.detail === 2) invokeWin('toggle_maximize');
    else if (e.detail === 1) invokeWin('start_dragging');
  });

  syncMaximized();
  window.addEventListener('resize', syncMaximized);
  ensureChrome();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureChrome, { once: true });
  }
  if (typeof MutationObserver !== 'undefined') {
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        syncMaximized();
  window.addEventListener('resize', syncMaximized);
  ensureChrome();
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
"##;

fn main() {
    #[cfg(target_os = "macos")]
    migrate_legacy_data();

    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            std::thread::spawn(|| {
                let _ = hanzod::ensure_hanzod_running();
            });

            dock_icon::init(app.handle())?;

            let start_url = if std::env::var("HANZO_TEAM_OFFLINE").ok().as_deref() == Some("1") {
                WebviewUrl::App("index.html".into())
            } else {
                let raw = std::env::var("HANZO_TEAM_URL")
                    .unwrap_or_else(|_| "https://hanzo.team".to_string());
                raw.parse::<tauri::Url>()
                    .map(WebviewUrl::External)
                    .unwrap_or_else(|_| WebviewUrl::App("index.html".into()))
            };

            let mut builder = WebviewWindowBuilder::new(app, "main", start_url)
                .title("Hanzo Team")
                .inner_size(460.0, 640.0)
                .min_inner_size(400.0, 560.0)
                .resizable(true)
                .center()
                .initialization_script(hanzod::HANZOD_INIT_SCRIPT)
                .initialization_script(HANZO_SHELL_CHROME_SCRIPT);

            #[cfg(target_os = "macos")]
            {
                builder = builder
                    .background_color(tauri::window::Color(0, 0, 0, 255))
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true);
            }

            #[cfg(target_os = "linux")]
            {
                builder = builder
                    .decorations(false)
                    .transparent(true)
                    .background_color(tauri::window::Color(0, 0, 0, 0));
            }

            #[cfg(all(not(target_os = "macos"), not(target_os = "linux")))]
            {
                builder = builder
                    .decorations(false)
                    .background_color(tauri::window::Color(0, 0, 0, 255));
            }

            let window = builder.build()?;
            #[cfg(target_os = "windows")]
            apply_windows_dwm_chrome(&window);
            let _ = window;

            Ok(())
        })
        .on_menu_event(|app, event| {
            dock_icon::handle_menu_event(app, event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            dock_icon::get_dock_icon_mode,
            dock_icon::set_dock_icon_mode,
            team_set_window_mode,
            team_hanzod_status,
            team_hanzod_worker,
            team_hanzod_cluster_up,
            team_hanzod_cluster_down,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hanzo Team desktop application");
}

#[cfg(test)]
mod tests {
    use super::HANZO_SHELL_CHROME_SCRIPT;

    #[test]
    fn shell_chrome_script_preserves_masthead_and_wires_frameless_window_controls() {
        assert!(!HANZO_SHELL_CHROME_SCRIPT.contains("[data-slot=\"masthead\"] { display: none"));
        assert!(!HANZO_SHELL_CHROME_SCRIPT.contains("TEAM_ICON_SVG"));
        assert!(HANZO_SHELL_CHROME_SCRIPT.contains(r#"data-slot="window-controls""#));
        assert!(HANZO_SHELL_CHROME_SCRIPT.contains("#121214"));
        assert!(HANZO_SHELL_CHROME_SCRIPT.contains("start_dragging"));
        assert!(HANZO_SHELL_CHROME_SCRIPT.contains("toggle_maximize"));
    }

    #[test]
    fn default_capability_grants_full_frameless_window_controls_on_local_and_hanzo_origins() {
        let cap = include_str!("../capabilities/default.json");
        for perm in [
            "core:window:allow-start-dragging",
            "core:window:allow-minimize",
            "core:window:allow-toggle-maximize",
            "core:window:allow-is-maximized",
            "core:window:allow-close",
        ] {
            assert!(cap.contains(perm), "missing capability {perm}");
        }
        assert!(cap.contains("https://hanzo.team/*"));
        assert!(cap.contains("https://hanzo.ai/*"));
        assert!(cap.contains("https://*.hanzo.ai/*"));
    }
}
