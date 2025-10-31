// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

mod db;
mod handler_command;
mod prisma;

use crate::db::repository::app_state_repository::AppStateRepository;
use crate::db::repository::folder_repository::FolderRepository;
use crate::db::repository::script_repository::ScriptRepository;
use crate::prisma::PrismaClient;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

pub static RT_HANDLE: OnceLock<tokio::runtime::Handle> = OnceLock::new();
pub static PRISMA_CLIENT: OnceLock<PrismaClient> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize)]
pub struct Folder {
    pub id: i32,
    pub name: String,
    pub ordering: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Script {
    pub id: i32,
    pub name: String,
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub id: i32,
    pub last_opened_folder_id: Option<i32>,
    pub dark_mode: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ReorderFoldersRequest {
    pub from_index: usize,
    pub to_index: usize,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFolderRequest {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateScriptRequest {
    pub name: String,
    pub content: String,
    pub folder_id: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScriptRequest {
    pub id: i32,
    pub name: Option<String>,
    pub content: Option<String>,
}

#[tauri::command]
async fn get_all_folders() -> Result<Vec<Folder>, String> {
    let repo = FolderRepository::new();
    let folders = repo
        .get_all_folders()
        .await
        .map_err(|e| format!("Failed to get folders: {}", e))?;

    Ok(folders
        .into_iter()
        .map(|f| Folder {
            id: f.id,
            name: f.name,
            ordering: f.ordering,
        })
        .collect())
}

#[tauri::command]
async fn create_folder(name: String) -> Result<Folder, String> {
    let repo = FolderRepository::new();

    // Get the count to determine the next ordering
    let count = repo.get_folder_count().await;

    let folder = repo
        .create_script_folder(&name, count as i32)
        .await
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    Ok(Folder {
        id: folder.id,
        name: folder.name,
        ordering: folder.ordering,
    })
}

#[tauri::command]
async fn delete_folder(id: i32) -> Result<(), String> {
    let repo = FolderRepository::new();
    repo.delete_script_folder(id)
        .await
        .map_err(|e| format!("Failed to delete folder: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn rename_folder(id: i32, new_name: String) -> Result<(), String> {
    let repo = FolderRepository::new();
    repo.rename_folder(id, new_name)
        .await
        .map_err(|e| format!("Failed to rename folder: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn reorder_folders(from_index: usize, to_index: usize) -> Result<(), String> {
    let repo = FolderRepository::new();
    repo.reorder_folders(from_index, to_index)
        .await
        .map_err(|e| format!("Failed to reorder folders: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_scripts_by_folder(folder_id: i32) -> Result<Vec<Script>, String> {
    // add some logging here
    #[cfg(debug_assertions)]
    {
        println!("Getting scripts for folder id: {}", folder_id);
    }
    let repo = ScriptRepository::new();
    let scripts = repo
        .get_scripts_by_folder(folder_id)
        .await
        .map_err(|e| format!("Failed to get scripts: {}", e))?;

    Ok(scripts
        .into_iter()
        .map(|s| Script {
            id: s.id,
            name: s.name,
            command: s.command,
        })
        .collect())
}

#[tauri::command]
async fn create_script(name: String, content: String, folder_id: i32) -> Result<Script, String> {
    let repo = ScriptRepository::new();

    // Get the count of scripts in the folder to determine the next ordering
    let count = repo
        .get_script_count_by_folder(folder_id)
        .await
        .map_err(|e| format!("Failed to get script count: {}", e))?;

    let script = repo
        .create_script(name.clone(), content.clone(), count as i32)
        .await
        .map_err(|e| format!("Failed to create script: {}", e))?;

    // Create the relationship between script and folder
    repo.create_script_relationship(folder_id, script.id)
        .await
        .map_err(|e| format!("Failed to create script relationship: {}", e))?;

    Ok(Script {
        id: script.id,
        name: script.name,
        command: script.command,
    })
}

#[tauri::command]
async fn update_script(
    id: i32,
    name: Option<String>,
    content: Option<String>,
) -> Result<Script, String> {
    let repo = ScriptRepository::new();

    if let Some(name) = name {
        repo.update_script_name(id, name)
            .await
            .map_err(|e| format!("Failed to update script name: {}", e))?;
    }

    if let Some(content) = content {
        repo.update_script_command(id, content)
            .await
            .map_err(|e| format!("Failed to update script command: {}", e))?;
    }

    Ok(Script {
        id: id,
        name: String::new(),
        command: String::new(),
    })
}

#[tauri::command]
async fn delete_script(id: i32, folder_id: i32) -> Result<(), String> {
    let repo = ScriptRepository::new();
    repo.delete_script(id, folder_id)
        .await
        .map_err(|e| format!("Failed to delete script: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn reorder_scripts(folder_id: i32, from_index: usize, to_index: usize) -> Result<(), String> {
    let repo = ScriptRepository::new();
    repo.reorder_scripts(folder_id, from_index, to_index)
        .await
        .map_err(|e| format!("Failed to reorder scripts: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_app_state() -> Result<Option<AppState>, String> {
    let repo = AppStateRepository::new();
    let state = repo
        .get_app_state()
        .await
        .map_err(|e| format!("Failed to get app state: {}", e))?;

    Ok(state.map(|s| AppState {
        id: s.id,
        last_opened_folder_id: s.last_opened_folder_id,
        dark_mode: s.dark_mode,
    }))
}

#[tauri::command]
async fn set_last_opened_folder(folder_id: i32) -> Result<AppState, String> {
    let repo = AppStateRepository::new();
    let state = repo
        .set_last_opened_folder(Some(folder_id)) // Wrap in Some when calling repository
        .await
        .map_err(|e| {
            eprintln!("Error in set_last_opened_folder: {}", e);
            format!("Failed to set last opened folder: {}", e)
        })?;

    Ok(AppState {
        id: state.id,
        last_opened_folder_id: state.last_opened_folder_id,
        dark_mode: state.dark_mode,
    })
}

#[tauri::command]
async fn get_dark_mode() -> Result<bool, String> {
    let repo = AppStateRepository::new();
    let state = repo
        .get_app_state()
        .await
        .map_err(|e| format!("Failed to get app state: {}", e))?;

    Ok(state.map(|s| s.dark_mode).unwrap_or(false))
}

#[tauri::command]
async fn set_dark_mode(enabled: bool) -> Result<bool, String> {
    let repo = AppStateRepository::new();
    let state = repo
        .set_dark_mode(enabled)
        .await
        .map_err(|e| format!("Failed to set dark mode: {}", e))?;

    Ok(state.dark_mode)
}

#[tauri::command]
async fn set_title_bar_color(window: tauri::Window, is_dark: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};
        use tauri::Manager;

        unsafe {
            let ns_window = window
                .ns_window()
                .map_err(|e| format!("Failed to get NSWindow: {}", e))?
                as id;

            if is_dark {
                // Dark mode - neutral-900 background (#171717)
                let color = NSColor::colorWithRed_green_blue_alpha_(
                    nil,
                    23.0 / 255.0, // R
                    23.0 / 255.0, // G
                    23.0 / 255.0, // B
                    1.0,          // Alpha
                );
                ns_window.setBackgroundColor_(color);
            } else {
                // Light mode - neutral-100 background (#f5f5f5)
                let color = NSColor::colorWithRed_green_blue_alpha_(
                    nil,
                    245.0 / 255.0, // R
                    245.0 / 255.0, // G
                    245.0 / 255.0, // B
                    1.0,           // Alpha
                );
                ns_window.setBackgroundColor_(color);
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, is_dark);
    }

    Ok(())
}

#[tauri::command]
async fn run_script(command: String) -> Result<(), String> {
    run_terminal_command(command);
    Ok(())
}

#[tauri::command]
async fn custom_command(name: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "message": format!("Hello, {}! Welcome to Tauri + Redux Toolkit!", name)
    }))
}

pub fn run_terminal_command(command: String) {
    let rt_handle = RT_HANDLE.get().expect("Runtime handle not initialized");
    rt_handle.spawn(async move {
        // Get the user's home directory
        let home = std::env::var("HOME").unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| "/Users".to_string())
        });

        // Detect the user's shell from /etc/passwd or use zsh as default
        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            std::fs::read_to_string("/etc/passwd")
                .ok()
                .and_then(|content| {
                    content.lines().find_map(|line| {
                        if line.contains(&home) {
                            line.split(':').last().map(|s| s.to_string())
                        } else {
                            None
                        }
                    })
                })
                .unwrap_or_else(|| "/bin/zsh".to_string())
        });

        #[cfg(debug_assertions)]
        println!("Using shell: {} for command: {}", shell, command);

        // Build the command that sources the shell config files before running
        let wrapped_command = if shell.contains("zsh") {
            format!(
                "source ~/.zshrc 2>/dev/null; source ~/.zprofile 2>/dev/null; {}",
                command
            )
        } else if shell.contains("bash") {
            format!(
                "source ~/.bash_profile 2>/dev/null; source ~/.bashrc 2>/dev/null; {}",
                command
            )
        } else {
            command.clone()
        };

        let output = tokio::process::Command::new(&shell)
            .arg("-l") // Login shell
            .arg("-c")
            .arg(&wrapped_command)
            .env("HOME", &home) // Ensure HOME is set
            .env(
                "USER",
                std::env::var("USER").unwrap_or_else(|_| whoami::username()),
            )
            .output()
            .await;

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                #[cfg(debug_assertions)]
                {
                    println!("Command executed: {}", command);
                    if !stdout.is_empty() {
                        println!("Output: {}", stdout);
                    }
                    if !stderr.is_empty() {
                        eprintln!("Error: {}", stderr);
                    }
                }

                // Show errors in both debug and release mode
                if !output.status.success() && !stderr.is_empty() {
                    eprintln!("Command '{}' failed: {}", command, stderr);
                }
            }
            Err(e) => eprintln!("Failed to execute command '{}': {:?}", command, e),
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::{Emitter, Manager};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            custom_command,
            get_all_folders,
            create_folder,
            delete_folder,
            rename_folder,
            reorder_folders,
            get_scripts_by_folder,
            create_script,
            update_script,
            delete_script,
            reorder_scripts,
            get_app_state,
            set_last_opened_folder,
            run_script,
            get_dark_mode,
            set_dark_mode,
            set_title_bar_color,
        ])
        .setup(|app| {
            // Setup window appearance for macOS
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{
                    NSColor, NSWindow, NSWindowButton, NSWindowStyleMask, NSWindowTitleVisibility,
                };
                use cocoa::base::{id, nil, NO, YES};
                use cocoa::foundation::NSRect;

                if let Some(window) = app.get_webview_window("main") {
                    unsafe {
                        if let Ok(ns_window) = window.ns_window() {
                            let ns_window = ns_window as id;

                            // Make title bar transparent and blended
                            ns_window.setTitlebarAppearsTransparent_(YES);
                            ns_window
                                .setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);

                            // Enable full size content view (allows content to go under title bar)
                            let mut style_mask = ns_window.styleMask();
                            style_mask |= NSWindowStyleMask::NSFullSizeContentViewWindowMask;
                            ns_window.setStyleMask_(style_mask);

                            // Adjust traffic light button positions
                            // Get the buttons
                            let close_button = ns_window
                                .standardWindowButton_(NSWindowButton::NSWindowCloseButton);
                            let miniaturize_button = ns_window
                                .standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
                            let zoom_button =
                                ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

                            if close_button != nil {
                                // Adjust button positions
                                let mut frame: NSRect = msg_send![close_button, frame];
                                frame.origin.x = frame.origin.x + 10.0; // Move right by 10px
                                frame.origin.y = -5.0; // Vertical position from top
                                let _: () = msg_send![close_button, setFrame: frame];
                            }

                            if miniaturize_button != nil {
                                let mut frame: NSRect = msg_send![miniaturize_button, frame];
                                frame.origin.x = frame.origin.x + 10.0; // Move right by 10px
                                frame.origin.y = -5.0;
                                let _: () = msg_send![miniaturize_button, setFrame: frame];
                            }

                            if zoom_button != nil {
                                let mut frame: NSRect = msg_send![zoom_button, frame];
                                frame.origin.x = frame.origin.x + 10.0; // Move right by 10px
                                frame.origin.y = -5.0;
                                let _: () = msg_send![zoom_button, setFrame: frame];
                            }

                            // Hide window shadow for cleaner look
                            ns_window.setHasShadow_(YES);

                            // Make window background transparent/opaque based on content
                            ns_window.setOpaque_(NO);

                            // Set initial color (light mode)
                            let color = NSColor::colorWithRed_green_blue_alpha_(
                                nil,
                                245.0 / 255.0,
                                245.0 / 255.0,
                                245.0 / 255.0,
                                1.0,
                            );
                            ns_window.setBackgroundColor_(color);
                        }
                    }
                }
            }

            // Edit menu with standard shortcuts
            use tauri::menu::PredefinedMenuItem;

            let undo = PredefinedMenuItem::undo(app, None)?;
            let cut = PredefinedMenuItem::cut(app, None)?;
            let copy = PredefinedMenuItem::copy(app, None)?;
            let paste = PredefinedMenuItem::paste(app, None)?;
            let select_all = PredefinedMenuItem::select_all(app, None)?;

            // Custom redo with Cmd+Y
            let redo = MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("Cmd+Y")
                .build(app)?;

            let edit_menu = tauri::menu::SubmenuBuilder::new(app, "Edit")
                .item(&undo)
                .item(&redo)
                .separator()
                .item(&cut)
                .item(&copy)
                .item(&paste)
                .separator()
                .item(&select_all)
                .build()?;

            // View menu
            let toggle_dark_mode = MenuItemBuilder::with_id("toggle_dark_mode", "Toggle Dark Mode")
                .accelerator("Cmd+D")
                .build(app)?;

            let quit = MenuItemBuilder::with_id("quit", "Quit")
                .accelerator("Cmd+Q")
                .build(app)?;

            let view_menu = tauri::menu::SubmenuBuilder::new(app, "View")
                .item(&toggle_dark_mode)
                .item(&quit)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&edit_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app, event| {
                if event.id() == "redo" {
                    // Execute redo command in the webview
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval("document.execCommand('redo')");
                    }
                }

                if event.id() == "toggle_dark_mode" {
                    // Emit an event to the frontend to toggle dark mode
                    if let Some(window) = app.get_webview_window("main") {
                        window.emit("toggle-dark-mode", ()).unwrap_or_else(|e| {
                            eprintln!("Failed to emit toggle-dark-mode event: {}", e);
                        });
                    }
                }

                if event.id() == "quit" {
                    app.exit(0);
                }
            });

            #[cfg(debug_assertions)]
            {
                let windows = app.webview_windows();
                if let Some(window) = windows.values().next() {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn init_db() {
    let db_path = if cfg!(debug_assertions) {
        // In debug mode, use current directory for easier development
        std::env::current_dir().unwrap().join("database.db")
    } else {
        // In release mode, use proper app data directory
        let app_data_dir = dirs::data_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap())
            .join("ShellScriptManager");

        // Create directory if it doesn't exist
        std::fs::create_dir_all(&app_data_dir).ok();

        app_data_dir.join("database.db")
    };

    let db_url = format!("file:{}", db_path.display());

    let rt = tokio::runtime::Runtime::new().unwrap();
    RT_HANDLE.set(rt.handle().clone()).unwrap();

    rt.block_on(async {
        match crate::prisma::new_client_with_url(&db_url).await {
            Ok(client) => {
                // Initialize database schema automatically for desktop app
                if let Err(e) = crate::db::get_db::initialize_database(&client).await {
                    #[cfg(debug_assertions)]
                    {
                        eprintln!("Failed to initialize database: {}", e);
                        eprintln!("Please check database permissions or file path");
                    }
                    std::process::exit(1);
                }

                crate::PRISMA_CLIENT.set(client).unwrap();
                #[cfg(debug_assertions)]
                println!("Database connection established successfully");
            }
            Err(e) => {
                #[cfg(debug_assertions)]
                {
                    eprintln!("Failed to connect to database: {}", e);
                    eprintln!("Please ensure the database exists by running: npm run migrate:dev");
                    std::process::exit(1);
                }
            }
        }
    });

    // Spawn a task to keep the runtime alive
    std::thread::spawn(move || {
        rt.block_on(async {
            // Keep alive until signal
            let _ = tokio::signal::ctrl_c().await;
        });
    });
}
