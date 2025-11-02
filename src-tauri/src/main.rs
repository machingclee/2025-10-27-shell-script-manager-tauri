#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Run the Tauri app
    // - Database initialization happens in setup via init_db()
    // - Spring Boot auto-starts in production mode only (not in dev)
    // - Spring Boot cleanup is handled via window close events
    shell_script_manager_lib::run();
}
