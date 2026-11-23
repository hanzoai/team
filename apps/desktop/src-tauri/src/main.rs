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

#[cfg(any(target_os = "macos", test))]
const MACOS_DESKTOP_INIT_SCRIPT: &str = r##"(function () {
  var STYLE_ID = 'hanzo-desktop-macos-chrome';
  var TEAM_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 1024 1024" role="img" aria-label="Hanzo Team">'
    + '<defs>'
    + '<linearGradient id="hanzo-team-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#19191b"/><stop offset="28%" stop-color="#09090a"/><stop offset="100%" stop-color="#000000"/></linearGradient>'
    + '<radialGradient id="hanzo-team-topGlow" cx="50%" cy="6%" r="65%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="45%" stop-color="#ffffff" stop-opacity="0.03"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="hanzo-team-rimGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/><stop offset="22%" stop-color="#ffffff" stop-opacity="0.12"/><stop offset="75%" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.10"/></linearGradient>'
    + '<linearGradient id="hanzo-team-glyphWhite" gradientUnits="userSpaceOnUse" x1="0" y1="220" x2="0" y2="800"><stop offset="0%" stop-color="#ffffff"/><stop offset="75%" stop-color="#f4f4f7"/><stop offset="100%" stop-color="#d8d8e0"/></linearGradient>'
    + '<clipPath id="hanzo-team-shellClip"><path d="M 248.00,24.00 L 776.00,24.00 C 905.92,24.00 1000.00,118.08 1000.00,248.00 L 1000.00,776.00 C 1000.00,905.92 905.92,1000.00 776.00,1000.00 L 248.00,1000.00 C 118.08,1000.00 24.00,905.92 24.00,776.00 L 24.00,248.00 C 24.00,118.08 118.08,24.00 248.00,24.00 Z"/></clipPath>'
    + '</defs>'
    + '<path d="M 248.00,24.00 L 776.00,24.00 C 905.92,24.00 1000.00,118.08 1000.00,248.00 L 1000.00,776.00 C 1000.00,905.92 905.92,1000.00 776.00,1000.00 L 248.00,1000.00 C 118.08,1000.00 24.00,905.92 24.00,776.00 L 24.00,248.00 C 24.00,118.08 118.08,24.00 248.00,24.00 Z" fill="url(#hanzo-team-bg)"/>'
    + '<path d="M 248.00,24.00 L 776.00,24.00 C 905.92,24.00 1000.00,118.08 1000.00,248.00 L 1000.00,776.00 C 1000.00,905.92 905.92,1000.00 776.00,1000.00 L 248.00,1000.00 C 118.08,1000.00 24.00,905.92 24.00,776.00 L 24.00,248.00 C 24.00,118.08 118.08,24.00 248.00,24.00 Z" fill="url(#hanzo-team-topGlow)"/>'
    + '<path d="M 249.00,31.00 L 775.00,31.00 C 901.44,31.00 993.00,122.56 993.00,249.00 L 993.00,775.00 C 993.00,901.44 901.44,993.00 775.00,993.00 L 249.00,993.00 C 122.56,993.00 31.00,901.44 31.00,775.00 L 31.00,249.00 C 31.00,122.56 122.56,31.00 249.00,31.00 Z" fill="none" stroke="url(#hanzo-team-rimGrad)" stroke-width="10"/>'
    + '<g clip-path="url(#hanzo-team-shellClip)">'
    + '<path d="M 456 226 H 746 C 804 226 846 268 846 326 V 486 C 846 534 818 570 778 582 L 794 654 C 798 672 778 684 762 674 L 668 614 H 456 C 398 614 356 572 356 514 V 326 C 356 268 398 226 456 226 Z" fill="#c4c4cc"/>'
    + '<path d="M 278 360 H 576 C 634 360 676 402 676 460 V 618 C 676 676 634 718 576 718 H 366 L 250 794 C 234 804 214 792 218 774 L 234 706 C 198 692 178 658 178 618 V 460 C 178 402 220 360 278 360 Z" fill="#050506" stroke="#050506" stroke-width="44" stroke-linejoin="round"/>'
    + '<path d="M 278 360 H 576 C 634 360 676 402 676 460 V 618 C 676 676 634 718 576 718 H 366 L 250 794 C 234 804 214 792 218 774 L 234 706 C 198 692 178 658 178 618 V 460 C 178 402 220 360 278 360 Z" fill="url(#hanzo-team-glyphWhite)"/>'
    + '</g>'
    + '</svg>';

  var CSS = [
    '[data-slot="window-controls"] { display: none !important; }',
    'html[data-hanzo-desktop-auth="true"] header,',
    'html[data-hanzo-desktop-auth="true"] [data-slot="header"],',
    'html[data-hanzo-desktop-auth="true"] [data-slot="masthead"],',
    'html[data-hanzo-desktop-auth="true"] [data-tauri-drag-region]:not([data-hanzo-drag-strip]):has([data-slot="window-controls"]) {',
    '  display: none !important;',
    '}',
    'html[data-hanzo-desktop-auth="true"] [data-slot="hero"],',
    'html[data-hanzo-desktop-auth="true"] [data-slot="focus"] {',
    '  margin-top: 0 !important;',
    '  min-height: 100svh !important;',
    '}',
    '[data-hanzo-drag-strip] {',
    '  position: fixed;',
    '  top: 0;',
    '  left: 0;',
    '  right: 0;',
    '  height: 36px;',
    '  z-index: 2147483647;',
    '  background: transparent;',
    '  -webkit-app-region: drag;',
    '}'
  ].join('\n');

  function isAuthPage() {
    var host = (window.location.hostname || '').toLowerCase();
    var path = (window.location.pathname || '').toLowerCase();
    var onHanzo = host === 'hanzo.ai' || host === 'www.hanzo.ai' || host.endsWith('.hanzo.ai');
    return onHanzo && (
      path === '/login' || path.indexOf('/login/') === 0 ||
      path === '/signup' || path.indexOf('/signup/') === 0
    );
  }

  function ensureStyle() {
    var root = document.head || document.documentElement;
    if (!root || document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    root.appendChild(style);
  }

  function sync() {
    var docEl = document.documentElement;
    if (!docEl) return;
    ensureStyle();

    var auth = isAuthPage();
    var nextFlag = auth ? 'true' : 'false';
    if (docEl.getAttribute('data-hanzo-desktop-auth') !== nextFlag) {
      docEl.setAttribute('data-hanzo-desktop-auth', nextFlag);
    }

    var body = document.body;
    if (!body) return;

    var strip = document.querySelector('[data-hanzo-drag-strip]');
    if (auth) {
      if (!strip) {
        strip = document.createElement('div');
        strip.setAttribute('data-tauri-drag-region', '');
        strip.setAttribute('data-hanzo-drag-strip', 'true');
        body.appendChild(strip);
      }

      if (!document.querySelector('[data-hanzo-app-icon]')) {
        var heroTitle = document.getElementById('hero-title');
        if (heroTitle && heroTitle.parentNode) {
          var wrap = document.createElement('div');
          wrap.setAttribute('data-hanzo-app-icon', 'hanzo-team');
          wrap.style.cssText = 'display:flex;justify-content:center;align-items:center;margin:0 auto 14px;width:64px;height:64px;flex-shrink:0;';
          wrap.innerHTML = TEAM_ICON_SVG;
          heroTitle.parentNode.insertBefore(wrap, heroTitle);
        }
      }
    } else if (strip && strip.parentNode) {
      strip.parentNode.removeChild(strip);
    }
  }

  function install() {
    sync();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sync, { once: true });
    }
    window.addEventListener('popstate', sync);
    if (window.history && window.history.pushState) {
      var origPush = window.history.pushState;
      window.history.pushState = function () {
        var ret = origPush.apply(this, arguments);
        sync();
        return ret;
      };
    }
    if (window.history && window.history.replaceState) {
      var origReplace = window.history.replaceState;
      window.history.replaceState = function () {
        var ret = origReplace.apply(this, arguments);
        sync();
        return ret;
      };
    }
    if (typeof MutationObserver !== 'undefined') {
      var scheduled = false;
      var observer = new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(function () {
          scheduled = false;
          sync();
        });
      });
      var target = document.documentElement;
      if (target) {
        observer.observe(target, { childList: true, subtree: true });
      }
    }
  }

  install();
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
            // Auto-discover and launch unified local hanzod (127.0.0.1:3690) in the background.
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

            #[cfg_attr(not(target_os = "macos"), allow(unused_mut))]
            let mut builder = WebviewWindowBuilder::new(
                app,
                "main",
                start_url,
            )
            .title("Hanzo Team")
            .inner_size(1440.0, 900.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .transparent(false)
            .center()
            .initialization_script(hanzod::HANZOD_INIT_SCRIPT);

            #[cfg(target_os = "macos")]
            {
                builder = builder
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true)
                    .initialization_script(MACOS_DESKTOP_INIT_SCRIPT);
            }

            builder.build()?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            dock_icon::handle_menu_event(app, event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            dock_icon::get_dock_icon_mode,
            dock_icon::set_dock_icon_mode,
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
    use super::MACOS_DESKTOP_INIT_SCRIPT;

    #[test]
    fn macos_init_script_hides_window_controls_and_injects_minimal_team_icon() {
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains(r#"[data-slot="window-controls"]"#));
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains("data-tauri-drag-region"));
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains("data-hanzo-app-icon"));
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains("hero-title"));
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains(
            "M 456 226 H 746 C 804 226 846 268 846 326"
        ));
        assert!(MACOS_DESKTOP_INIT_SCRIPT.contains(
            "M 278 360 H 576 C 634 360 676 402 676 460"
        ));
    }
}
