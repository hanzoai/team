use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

pub const DEFAULT_HANZOD_ADDR: &str = "127.0.0.1:3690";
pub const DEFAULT_HANZOD_ORIGIN: &str = "http://127.0.0.1:3690";

pub const HANZOD_INIT_SCRIPT: &str = r#"(function () {
  window.__HANZOD__ = { origin: 'http://127.0.0.1:3690', soleBackend: true };
})();"#;

static SPAWN_LOCK: Mutex<()> = Mutex::new(());

pub fn configured_hanzod_addr() -> String {
    if let Ok(url) = std::env::var("HANZOD_URL") {
        let trimmed = url.trim().trim_end_matches('/');
        if let Some(rest) = trimmed.strip_prefix("http://") {
            let host_port = rest.split('/').next().unwrap_or(rest);
            if !host_port.is_empty() {
                return host_port.to_string();
            }
        }
    }
    if let Ok(addr) = std::env::var("HANZOD_HTTP_ADDR") {
        let trimmed = addr.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    DEFAULT_HANZOD_ADDR.to_string()
}

pub fn is_hanzod_listening(addr: &str) -> bool {
    let Ok(mut addrs) = addr.to_socket_addrs() else {
        return false;
    };
    let Some(sock_addr) = addrs.next() else {
        return false;
    };
    TcpStream::connect_timeout(&sock_addr, Duration::from_millis(200)).is_ok()
}

pub fn candidate_hanzod_paths(
    exe_path: Option<&Path>,
    home_dir: Option<&Path>,
    env_bin: Option<&str>,
    path_env: Option<&str>,
) -> Vec<PathBuf> {
    let bin_name = if cfg!(windows) { "hanzod.exe" } else { "hanzod" };
    let mut out = Vec::new();

    if let Some(explicit) = env_bin.map(str::trim).filter(|s| !s.is_empty()) {
        out.push(PathBuf::from(explicit));
    }

    if let Some(exe) = exe_path {
        if let Some(dir) = exe.parent() {
            out.push(dir.join("binaries").join(bin_name));
            out.push(dir.join(bin_name));
            if let Some(parent) = dir.parent() {
                out.push(parent.join("Resources").join(bin_name));
                out.push(parent.join("Resources").join("binaries").join(bin_name));
            }
        }
    }

    if let Some(home) = home_dir {
        out.push(home.join(".hanzo").join("bin").join(bin_name));
        out.push(home.join(".local").join("bin").join(bin_name));
    }

    if !cfg!(windows) {
        out.push(PathBuf::from("/usr/local/bin").join(bin_name));
        out.push(PathBuf::from("/opt/homebrew/bin").join(bin_name));
    }

    if let Some(paths) = path_env {
        for dir in std::env::split_paths(paths) {
            if !dir.as_os_str().is_empty() {
                out.push(dir.join(bin_name));
            }
        }
    }

    out
}

pub fn discover_hanzod_binary() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok();
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from);
    let env_bin = std::env::var("HANZOD_BIN").ok();
    let path_env = std::env::var("PATH").ok();

    candidate_hanzod_paths(
        exe.as_deref(),
        home.as_deref(),
        env_bin.as_deref(),
        path_env.as_deref(),
    )
    .into_iter()
    .find(|p| p.is_file())
}

pub fn resolve_hanzo_token() -> Option<String> {
    for key in ["HANZO_API_KEY", "HANZO_TOKEN"] {
        if let Ok(val) = std::env::var(key) {
            let trimmed = val.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    let mut dirs_to_check = Vec::new();
    if let Ok(data_dir) = std::env::var("HANZO_DATA_DIR") {
        if !data_dir.trim().is_empty() {
            dirs_to_check.push(PathBuf::from(data_dir.trim()));
        }
    }
    if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
        let home = PathBuf::from(home);
        dirs_to_check.push(home.join(".hanzo"));
        dirs_to_check.push(home.join(".local").join("share").join("hanzo"));
        dirs_to_check.push(home.join("Library").join("Application Support").join("hanzo"));
    }

    for dir in dirs_to_check {
        for file in ["credentials.json", "auth.json", "token.json"] {
            let path = dir.join(file);
            if let Ok(bytes) = std::fs::read(&path) {
                if let Ok(json) = serde_json::from_slice::<Value>(&bytes) {
                    for field in ["access_token", "token", "api_key", "apiKey"] {
                        if let Some(tok) = json.get(field).and_then(Value::as_str) {
                            let trimmed = tok.trim();
                            if !trimmed.is_empty() {
                                return Some(trimmed.to_string());
                            }
                        }
                    }
                }
            }
        }
        let raw_token = dir.join("token");
        if let Ok(text) = std::fs::read_to_string(&raw_token) {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    None
}

pub fn ensure_hanzod_running() -> Result<String, String> {
    let addr = configured_hanzod_addr();
    if is_hanzod_listening(&addr) {
        return Ok(format!("http://{addr}"));
    }

    let _guard = SPAWN_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    if is_hanzod_listening(&addr) {
        return Ok(format!("http://{addr}"));
    }

    let Some(bin) = discover_hanzod_binary() else {
        return Err(format!(
            "hanzod is not listening on {addr} and no hanzod binary was found"
        ));
    };

    let mut cmd = Command::new(&bin);
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    if addr != DEFAULT_HANZOD_ADDR {
        cmd.env("HANZOD_HTTP_ADDR", &addr);
    }

    cmd.spawn()
        .map_err(|e| format!("failed to spawn hanzod ({}): {e}", bin.display()))?;

    for _ in 0..25 {
        std::thread::sleep(Duration::from_millis(80));
        if is_hanzod_listening(&addr) {
            return Ok(format!("http://{addr}"));
        }
    }

    Err(format!(
        "spawned hanzod ({}) but {addr} did not start listening in time",
        bin.display()
    ))
}

fn decode_chunked(input: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut pos = 0;
    while pos < input.len() {
        let Some(line_end_rel) = input[pos..].windows(2).position(|w| w == b"\r\n") else {
            break;
        };
        let size_line = &input[pos..pos + line_end_rel];
        let size_str = std::str::from_utf8(size_line)
            .unwrap_or("0")
            .split(';')
            .next()
            .unwrap_or("0")
            .trim();
        let Ok(chunk_len) = usize::from_str_radix(size_str, 16) else {
            break;
        };
        pos += line_end_rel + 2;
        if chunk_len == 0 {
            break;
        }
        let end = (pos + chunk_len).min(input.len());
        out.extend_from_slice(&input[pos..end]);
        pos = (end + 2).min(input.len());
    }
    out
}

pub fn http_json_request(
    addr: &str,
    method: &str,
    path: &str,
    body: Option<&Value>,
    token: Option<&str>,
) -> Result<Value, String> {
    let sock_addr: SocketAddr = addr
        .to_socket_addrs()
        .map_err(|e| format!("invalid hanzod address {addr}: {e}"))?
        .next()
        .ok_or_else(|| format!("unable to resolve hanzod address {addr}"))?;

    let mut stream = TcpStream::connect_timeout(&sock_addr, Duration::from_secs(2))
        .map_err(|e| format!("failed to connect to hanzod at {addr}: {e}"))?;
    let _ = stream.set_read_timeout(Some(Duration::from_secs(15)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));

    let body_bytes = match body {
        Some(v) => serde_json::to_vec(v).map_err(|e| e.to_string())?,
        None if method == "POST" || method == "PUT" => b"{}".to_vec(),
        None => Vec::new(),
    };

    let mut req = format!(
        "{method} {path} HTTP/1.1\r\nHost: {addr}\r\nAccept: application/json\r\nConnection: close\r\n"
    );
    if let Some(tok) = token.filter(|t| !t.trim().is_empty()) {
        req.push_str(&format!("Authorization: Bearer {}\r\n", tok.trim()));
    }
    if !body_bytes.is_empty() || method == "POST" || method == "PUT" {
        req.push_str("Content-Type: application/json\r\n");
        req.push_str(&format!("Content-Length: {}\r\n", body_bytes.len()));
    }
    req.push_str("\r\n");

    let mut payload_buf = req.into_bytes();
    payload_buf.extend_from_slice(&body_bytes);

    stream
        .write_all(&payload_buf)
        .and_then(|_| stream.flush())
        .map_err(|e| format!("failed writing HTTP request to hanzod: {e}"))?;

    let mut raw = Vec::new();
    stream
        .read_to_end(&mut raw)
        .map_err(|e| format!("failed reading HTTP response from hanzod: {e}"))?;

    let Some(header_end) = raw.windows(4).position(|w| w == b"\r\n\r\n") else {
        return Err("malformed HTTP response from hanzod".to_string());
    };

    let header_str = String::from_utf8_lossy(&raw[..header_end]);
    let mut lines = header_str.lines();
    let status_line = lines.next().unwrap_or("");
    let status_code: u16 = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(500);

    let is_chunked = lines.any(|line| {
        let lower = line.to_ascii_lowercase();
        lower.starts_with("transfer-encoding:") && lower.contains("chunked")
    });

    let body_slice = &raw[header_end + 4..];
    let decoded = if is_chunked {
        decode_chunked(body_slice)
    } else {
        body_slice.to_vec()
    };

    if !(200..300).contains(&status_code) {
        let msg = String::from_utf8_lossy(&decoded).trim().to_string();
        return Err(if msg.is_empty() {
            format!("hanzod {method} {path} failed with HTTP {status_code}")
        } else {
            format!("hanzod {method} {path} failed ({status_code}): {msg}")
        });
    }

    if decoded.is_empty() {
        return Ok(json!({ "ok": true }));
    }

    serde_json::from_slice(&decoded)
        .map_err(|e| format!("invalid JSON from hanzod {path}: {e}"))
}

pub fn status() -> Result<Value, String> {
    let _ = ensure_hanzod_running();
    let addr = configured_hanzod_addr();
    let token = resolve_hanzo_token();
    http_json_request(&addr, "GET", "/v1/hanzod", None, token.as_deref())
}

pub fn worker_status() -> Result<Value, String> {
    let _ = ensure_hanzod_running();
    let addr = configured_hanzod_addr();
    let token = resolve_hanzo_token();
    http_json_request(&addr, "GET", "/v1/hanzod/worker", None, token.as_deref())
}

pub fn cluster_up(mode: Option<String>) -> Result<Value, String> {
    let _ = ensure_hanzod_running();
    let addr = configured_hanzod_addr();
    let token = resolve_hanzo_token();
    let payload = match mode.as_deref().map(str::trim).filter(|m| !m.is_empty()) {
        Some(m) => json!({ "mode": m }),
        None => json!({}),
    };
    http_json_request(&addr, "POST", "/v1/cluster/up", Some(&payload), token.as_deref())
}

pub fn cluster_down() -> Result<Value, String> {
    let _ = ensure_hanzod_running();
    let addr = configured_hanzod_addr();
    let token = resolve_hanzo_token();
    let payload = json!({});
    http_json_request(&addr, "POST", "/v1/cluster/down", Some(&payload), token.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn init_script_exposes_unified_hanzod_origin_and_sole_backend() {
        assert_eq!(DEFAULT_HANZOD_ORIGIN, "http://127.0.0.1:3690");
        assert!(HANZOD_INIT_SCRIPT.contains("window.__HANZOD__"));
        assert!(HANZOD_INIT_SCRIPT.contains("origin: 'http://127.0.0.1:3690'"));
        assert!(HANZOD_INIT_SCRIPT.contains("soleBackend: true"));
    }

    #[test]
    fn candidate_paths_prioritize_env_sidecar_and_hanzo_bin() {
        let exe = Path::new("/Applications/Hanzo Team.app/Contents/MacOS/hanzo-team");
        let home = Path::new("/Users/z");
        let candidates = candidate_hanzod_paths(
            Some(exe),
            Some(home),
            Some("/custom/hanzod"),
            Some("/usr/bin:/bin"),
        );
        assert_eq!(candidates[0], PathBuf::from("/custom/hanzod"));
        assert!(candidates.contains(&PathBuf::from(
            "/Applications/Hanzo Team.app/Contents/MacOS/binaries/hanzod"
        )));
        assert!(candidates.contains(&PathBuf::from(
            "/Applications/Hanzo Team.app/Contents/Resources/hanzod"
        )));
        assert!(candidates.contains(&PathBuf::from("/Users/z/.hanzo/bin/hanzod")));
    }

    #[test]
    fn http_json_request_talks_to_local_hanzod_endpoints() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock hanzod");
        let addr = listener.local_addr().unwrap().to_string();

        let server = std::thread::spawn(move || {
            for _ in 0..2 {
                let (mut stream, _) = listener.accept().expect("accept");
                let mut buf = [0u8; 2048];
                let n = stream.read(&mut buf).expect("read");
                let req = String::from_utf8_lossy(&buf[..n]);
                let body = if req.starts_with("GET /v1/hanzod ") {
                    r#"{"version":"0.4.0","sole_desktop_backend":true}"#
                } else if req.starts_with("POST /v1/cluster/up ") {
                    assert!(req.contains("Authorization: Bearer test-tok"));
                    assert!(req.contains(r#"{"mode":"k3s"}"#));
                    r#"{"ok":true,"cluster_state":"running","mode":"k3s"}"#
                } else {
                    r#"{"error":"unexpected"}"#
                };
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                stream.write_all(resp.as_bytes()).expect("write");
            }
        });

        let manifest = http_json_request(&addr, "GET", "/v1/hanzod", None, None).unwrap();
        assert_eq!(manifest["version"], "0.4.0");
        assert_eq!(manifest["sole_desktop_backend"], true);

        let up = http_json_request(
            &addr,
            "POST",
            "/v1/cluster/up",
            Some(&json!({ "mode": "k3s" })),
            Some("test-tok"),
        )
        .unwrap();
        assert_eq!(up["cluster_state"], "running");

        server.join().unwrap();
    }
}
