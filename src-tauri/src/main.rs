#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize database
    shell_script_manager_lib::init_db();

    // Start Spring Boot backend
    // DISABLED: Launch Spring Boot manually from IntelliJ instead
    // shell_script_manager_lib::start_spring_boot();

    // Run the Tauri app
    shell_script_manager_lib::run();

    // Cleanup: Shutdown Spring Boot when app closes
    // DISABLED: Since we're not auto-starting, no need to auto-shutdown
    // shell_script_manager_lib::shutdown_spring_boot();
}
