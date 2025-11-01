// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

mod prisma;

use prisma::PrismaClient;
use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Manager;

pub static RT_HANDLE: OnceLock<tokio::runtime::Handle> = OnceLock::new();
pub static PRISMA_CLIENT: OnceLock<PrismaClient> = OnceLock::new();
pub static SPRING_BOOT_PROCESS: OnceLock<Arc<Mutex<Option<Child>>>> = OnceLock::new();

#[tauri::command]
async fn run_script(command: String) -> Result<(), String> {
    run_terminal_command(command);
    Ok(())
}

#[tauri::command]
async fn check_backend_health() -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    match client.get("http://localhost:7070/health").await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

// Function to determine database path based on environment
fn get_database_path(app_handle: &tauri::AppHandle) -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        // In development, use the local src-tauri directory
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let db_path = current_dir.join("src-tauri").join("database.db");
        Ok(db_path.to_string_lossy().to_string())
    }

    #[cfg(not(debug_assertions))]
    {
        // In production, use the app data directory
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // Create the directory if it doesn't exist
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        let db_path = app_data_dir.join("database.db");
        Ok(db_path.to_string_lossy().to_string())
    }
}

pub fn run_terminal_command(command: String) {
    let rt_handle = RT_HANDLE.get().expect("Runtime handle not initialized");
    rt_handle.spawn(async move {
        let shell = if cfg!(target_os = "windows") {
            "cmd"
        } else {
            "/bin/zsh"
        };

        let arg_flag = if cfg!(target_os = "windows") {
            "/C"
        } else {
            "-c"
        };

        let user = whoami::username();
        let hostname = whoami::devicename();
        let home_dir = dirs::home_dir().unwrap_or_default();

        // Create the AppleScript to open Terminal with the command
        #[cfg(target_os = "macos")]
        let applescript = format!(
            r#"
            tell application "Terminal"
                activate
                do script "cd {} && PS1='\\u@\\h \\W$ ' {} -c '{}; exec {} '"
            end tell
            "#,
            home_dir.display(),
            shell,
            command,
            shell
        );

        #[cfg(target_os = "macos")]
        match Command::new("osascript")
            .arg("-e")
            .arg(&applescript)
            .spawn()
        {
            Ok(_) => {}
            Err(e) => eprintln!("Failed to execute command '{}': {:?}", command, e),
        }

        #[cfg(not(target_os = "macos"))]
        {
            // For Windows and Linux, execute directly
            match Command::new(shell).arg(arg_flag).arg(&command).spawn() {
                Ok(_) => {}
                Err(e) => eprintln!("Failed to execute command '{}': {:?}", command, e),
            }
        }
    });
}

fn start_spring_boot_backend(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Check if backend is already running
    let rt = tokio::runtime::Runtime::new().unwrap();
    if let Ok(true) = rt.block_on(check_backend_health()) {
        println!("Spring Boot backend already running");
        return Ok(());
    }

    println!("Starting Spring Boot backend...");

    // Get the database path
    let db_path = get_database_path(&app_handle)?;
    println!("Database path: {}", db_path);

    // Get the path to the backend-spring directory
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let backend_dir = resource_path.join("backend-spring");
    println!("Backend directory: {:?}", backend_dir);

    #[cfg(debug_assertions)]
    {
        // In development, use gradlew bootRun
        let project_root = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let dev_backend_dir = project_root.join("backend-spring");
        let gradlew_path = dev_backend_dir.join("gradlew");

        println!("Development mode: Using gradlew at {:?}", gradlew_path);

        let child = Command::new(&gradlew_path)
            .current_dir(&dev_backend_dir)
            .arg("bootRun")
            .arg(format!(
                "--args=--spring.datasource.url=jdbc:sqlite:{}",
                db_path
            ))
            .spawn()
            .map_err(|e| format!("Failed to start Spring Boot backend: {}", e))?;

        // Store the process handle
        if let Some(process_mutex) = SPRING_BOOT_PROCESS.get() {
            *process_mutex.lock().unwrap() = Some(child);
        }
    }

    #[cfg(not(debug_assertions))]
    {
        // In production, use the bundled JAR and JRE
        let jar_path = backend_dir.join("app.jar");
        let jre_dir = backend_dir.join("jre");

        // Determine the java executable path based on OS
        #[cfg(target_os = "macos")]
        let java_executable = jre_dir
            .join("Contents")
            .join("Home")
            .join("bin")
            .join("java");

        #[cfg(target_os = "windows")]
        let java_executable = jre_dir.join("bin").join("java.exe");

        #[cfg(target_os = "linux")]
        let java_executable = jre_dir.join("bin").join("java");

        println!("Production mode: Using JAR at {:?}", jar_path);
        println!("Using Java executable at {:?}", java_executable);

        // Verify JAR exists
        if !jar_path.exists() {
            return Err(format!("JAR file not found at {:?}", jar_path));
        }

        // Verify Java executable exists
        if !java_executable.exists() {
            return Err(format!(
                "Java executable not found at {:?}. Please ensure JRE is properly bundled.",
                java_executable
            ));
        }

        let child = Command::new(&java_executable)
            .current_dir(&backend_dir)
            .arg("-jar")
            .arg(&jar_path)
            .arg(format!("--spring.datasource.url=jdbc:sqlite:{}", db_path))
            .spawn()
            .map_err(|e| format!("Failed to start Spring Boot backend: {}", e))?;

        // Store the process handle
        if let Some(process_mutex) = SPRING_BOOT_PROCESS.get() {
            *process_mutex.lock().unwrap() = Some(child);
        }
    }

    println!("Spring Boot backend started successfully");
    Ok(())
}

fn check_backend_health_sync() -> Result<bool, String> {
    let rt =
        tokio::runtime::Runtime::new().map_err(|e| format!("Failed to create runtime: {}", e))?;
    rt.block_on(check_backend_health())
}

fn kill_spring_boot_backend() {
    if let Some(process_mutex) = SPRING_BOOT_PROCESS.get() {
        if let Some(mut process) = process_mutex.lock().unwrap().take() {
            println!("Shutting down Spring Boot backend...");
            let _ = process.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, Submenu};
    use tauri::{Emitter, Manager};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_script, check_backend_health,])
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

                            // Enable full size content view
                            let mut style_mask = ns_window.styleMask();
                            style_mask |= NSWindowStyleMask::NSFullSizeContentViewWindowMask;
                            ns_window.setStyleMask_(style_mask);

                            // Adjust traffic light button positions
                            let close_button = ns_window
                                .standardWindowButton_(NSWindowButton::NSWindowCloseButton);
                            let miniaturize_button = ns_window
                                .standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
                            let zoom_button =
                                ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

                            if close_button != nil {
                                let mut frame: NSRect = msg_send![close_button, frame];
                                frame.origin.x = frame.origin.x + 10.0;
                                frame.origin.y = -5.0;
                                let _: () = msg_send![close_button, setFrame: frame];
                            }

                            if miniaturize_button != nil {
                                let mut frame: NSRect = msg_send![miniaturize_button, frame];
                                frame.origin.x = frame.origin.x + 10.0;
                                frame.origin.y = -5.0;
                                let _: () = msg_send![miniaturize_button, setFrame: frame];
                            }

                            if zoom_button != nil {
                                let mut frame: NSRect = msg_send![zoom_button, frame];
                                frame.origin.x = frame.origin.x + 10.0;
                                frame.origin.y = -5.0;
                                let _: () = msg_send![zoom_button, setFrame: frame];
                            }
                        }
                    }
                }
            }

            // Initialize runtime handle for async operations
            let runtime = tokio::runtime::Runtime::new().unwrap();
            RT_HANDLE.set(runtime.handle().clone()).unwrap();

            // Get the appropriate database path
            let db_path = get_database_path(app.handle())?;
            println!("Database location: {}", db_path);

            // Set DATABASE_URL environment variable for Prisma
            std::env::set_var("DATABASE_URL", format!("file:{}", db_path));

            // Initialize Prisma client and run migrations to create database
            let rt_handle = RT_HANDLE.get().unwrap();
            rt_handle.block_on(async {
                println!("Initializing database...");
                let client = PrismaClient::_builder()
                    .build()
                    .await
                    .expect("Failed to create Prisma client");

                #[cfg(debug_assertions)]
                {
                    println!("Running database migrations...");
                    client
                        ._db_push()
                        .accept_data_loss()
                        .await
                        .expect("Failed to run migrations");
                }

                PRISMA_CLIENT
                    .set(client)
                    .expect("Failed to set Prisma client");
                println!("Database initialized successfully");
            });

            // Initialize Spring Boot process storage
            SPRING_BOOT_PROCESS.set(Arc::new(Mutex::new(None))).unwrap();

            // Start Spring Boot backend
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Err(e) = start_spring_boot_backend(app_handle) {
                    eprintln!("Failed to start Spring Boot backend: {}", e);
                }
            });

            // Setup menu (macOS only)
            #[cfg(target_os = "macos")]
            {
                // Edit menu with standard shortcuts
                let undo = PredefinedMenuItem::undo(app, None)?;
                let redo_item = MenuItemBuilder::with_id("redo", "Redo")
                    .accelerator("Cmd+Y")
                    .build(app)?;
                let cut = PredefinedMenuItem::cut(app, None)?;
                let copy = PredefinedMenuItem::copy(app, None)?;
                let paste = PredefinedMenuItem::paste(app, None)?;
                let select_all = PredefinedMenuItem::select_all(app, None)?;

                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[&undo, &redo_item, &cut, &copy, &paste, &select_all],
                )?;

                // View menu
                let dark_mode_toggle =
                    MenuItemBuilder::with_id("toggle_dark_mode", "Toggle Dark Mode")
                        .accelerator("Cmd+Shift+D")
                        .build(app)?;

                let view_menu = Submenu::with_items(app, "View", true, &[&dark_mode_toggle])?;

                // App menu with Quit
                let quit = MenuItemBuilder::with_id("quit", "Quit")
                    .accelerator("Cmd+Q")
                    .build(app)?;

                let menu = MenuBuilder::new(app)
                    .item(&edit_menu)
                    .item(&view_menu)
                    .item(&quit)
                    .build()?;

                app.set_menu(menu)?;

                // Handle menu events
                app.on_menu_event(move |app, event| {
                    if event.id() == "redo" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval("document.execCommand('redo')");
                        }
                    }

                    if event.id() == "toggle_dark_mode" {
                        if let Some(window) = app.get_webview_window("main") {
                            window.emit("toggle-dark-mode", ()).unwrap_or_else(|e| {
                                eprintln!("Failed to emit toggle-dark-mode event: {}", e);
                            });
                        }
                    }

                    if event.id() == "quit" {
                        kill_spring_boot_backend();
                        app.exit(0);
                    }
                });
            }

            #[cfg(debug_assertions)]
            {
                let windows = app.webview_windows();
                if let Some(window) = windows.values().next() {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                kill_spring_boot_backend();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
