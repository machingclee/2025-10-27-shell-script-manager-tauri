#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Run the Tauri app
    // - Spring Boot creates the H2 schema via Flyway on startup (only DB client)
    // - Spring Boot auto-starts in production mode only (not in dev)
    // - Spring Boot cleanup is handled via window close events
    shell_script_manager_lib::run();
}
