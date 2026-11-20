
/// The app's version is package.json's (tauri.conf.json reads it there). Cargo's
/// cannot read a file, so the build refuses a Cargo.toml that disagrees rather than
/// letting the two drift.
fn follow_package_json(path: &str) {
    println!("cargo:rerun-if-changed={path}");
    let json = std::fs::read_to_string(path).unwrap_or_else(|e| panic!("{path}: {e}"));
    let version = json
        .split("\"version\"")
        .nth(1)
        .and_then(|s| s.split('"').nth(1))
        .unwrap_or_else(|| panic!("{path} has no version"));
    let own = std::env::var("CARGO_PKG_VERSION").expect("CARGO_PKG_VERSION");
    assert_eq!(
        version, own,
        "Cargo.toml version {own} must equal the version in {path} ({version}); set version = \"{version}\" in Cargo.toml"
    );
}
fn main() {
    follow_package_json("../../../package.json");
    tauri_build::build()
}
