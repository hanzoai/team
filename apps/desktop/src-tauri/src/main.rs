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
    + '<filter id="hanzo-team-minimal-edgeglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>'
    + '<linearGradient id="hanzo-team-minimal-tile" x1="0" y1="0" x2="0.18" y2="1"><stop offset="0" stop-color="#434343"/><stop offset="0.08" stop-color="#292929"/><stop offset="0.27" stop-color="#141414"/><stop offset="0.67" stop-color="#090909"/><stop offset="1" stop-color="#020202"/></linearGradient>'
    + '<linearGradient id="hanzo-team-minimal-outline" x1="0" y1="0" x2="0.26" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset=".28" stop-color="#bcbcbc" stop-opacity=".65"/><stop offset="0.58" stop-color="#6d6d6d" stop-opacity=".30"/><stop offset="1" stop-color="#f7f7f7" stop-opacity=".035"/></linearGradient>'
    + '<linearGradient id="hanzo-team-minimal-metal" x1="0.05" y1="0" x2=".83" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".38" stop-color="#f9f9f9"/><stop offset=".83" stop-color="#ededed"/><stop offset="1" stop-color="#bcbcbc"/></linearGradient>'
    + '<linearGradient id="hanzo-team-minimal-highlight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    + '<filter id="hanzo-team-minimal-glyphshadow" x="-20%" y="-20%" width="150%" height="155%"><feDropShadow dx="0" dy="7" stdDeviation="4.5" flood-color="#000" flood-opacity=".60"/></filter>'
    + '<clipPath id="hanzo-team-minimal-bounds"><rect x="8" y="8" width="1008" height="1008" rx="232"/></clipPath>'
    + '</defs>'
    + '<rect x="8" y="8" width="1008" height="1008" rx="232" fill="url(#hanzo-team-minimal-tile)"/>'
    + '<g clip-path="url(#hanzo-team-minimal-bounds)"><ellipse cx="502" cy="-230" rx="740" ry="550" fill="url(#hanzo-team-minimal-highlight)" opacity="0.18"/></g>'
    + '<path d="M239 14 C114 14 14 114 14 238 M239 14 H785 C909 14 1010 115 1010 238" fill="none" stroke="#fff" stroke-width="18" opacity=".28" filter="url(#hanzo-team-minimal-edgeglow)"/>'
    + '<path d="M240 13 H784 C912 13 1010 111 1010 241" fill="none" stroke="#fff" stroke-width="6" opacity=".29"/>'
    + '<rect x="11" y="11" width="1002" height="1002" rx="229" fill="none" stroke="url(#hanzo-team-minimal-outline)" stroke-width="4"/>'
    + '<g transform="translate(0 22)"><g filter="url(#hanzo-team-minimal-glyphshadow)" fill="none" stroke="url(#hanzo-team-minimal-metal)" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"><path d="M214 388 H810 M198 580 H794 M418 232 L354 736 M670 232 L606 736"/></g></g>'
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
            "M214 388 H810 M198 580 H794 M418 232 L354 736 M670 232 L606 736"
        ));
    }
}
