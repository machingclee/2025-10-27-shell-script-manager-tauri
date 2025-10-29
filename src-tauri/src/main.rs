#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    shell_script_manager_lib::init_db();
    shell_script_manager_lib::run()
}
