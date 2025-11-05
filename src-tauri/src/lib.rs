// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

mod prisma;

use prisma::PrismaClient;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Manager;

pub static RT_HANDLE: OnceLock<tokio::runtime::Handle> = OnceLock::new();
pub static PRISMA_CLIENT: OnceLock<PrismaClient> = OnceLock::new();
pub static SPRING_BOOT_PROCESS: OnceLock<Arc<Mutex<Option<Child>>>> = OnceLock::new();
pub static BACKEND_PORT: OnceLock<u16> = OnceLock::new();

#[tauri::command]
async fn run_script(command: String) -> Result<(), String> {
    println!("Running script command in Terminal: {}", command);
    open_terminal_with_command(command);
    Ok(())
}

#[tauri::command]
async fn execute_command(command: String) -> Result<(), String> {
    // Execute command silently without opening a Terminal window
    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "/bin/sh"
    };

    let arg_flag = if cfg!(target_os = "windows") {
        "/C"
    } else {
        "-c"
    };

    Command::new(shell)
        .arg(arg_flag)
        .arg(&command)
        .spawn()
        .map_err(|e| format!("Failed to execute command '{}': {}", command, e))?;

    Ok(())
}

#[tauri::command]
async fn get_backend_port() -> Result<u16, String> {
    BACKEND_PORT
        .get()
        .copied()
        .ok_or_else(|| "Backend port not initialized".to_string())
}

#[tauri::command]
async fn check_backend_health() -> Result<bool, String> {
    let port = get_backend_port().await?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("http://localhost:{}/health", port);
    match client.get(&url).send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_script,
            execute_command,
            get_backend_port,
            check_backend_health,
        ])
        .setup(|app| {
            // 1. Setup macOS window appearance
            #[cfg(target_os = "macos")]
            setup_macos_window(app);

            // 2. Initialize runtime for async operations
            init_runtime()?;

            // 3. Initialize database
            init_db(app.handle())?;

            // 4. Initialize and optionally start Spring Boot
            init_spring_boot(app.handle().clone())?;

            // 5. Setup macOS menu and handlers
            #[cfg(target_os = "macos")]
            {
                setup_macos_menu(app)?;
                setup_menu_handlers(app);
            }

            // // 6. Open DevTools in debug mode
            // #[cfg(debug_assertions)]
            // open_devtools(app);

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

// Function to determine database path based on environment
fn get_database_path(app_handle: &tauri::AppHandle) -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        // In development, use the current directory (which should be src-tauri)
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        let db_path = current_dir.join("database.db");
        Ok(db_path.to_string_lossy().to_string())
    }

    #[cfg(not(debug_assertions))]
    {
        // In production, use Application Support directory with app name from Cargo.toml
        let app_name = env!("CARGO_PKG_NAME");
        let home_dir =
            std::env::var("HOME").map_err(|e| format!("Failed to get HOME directory: {}", e))?;

        #[cfg(target_os = "macos")]
        let app_support_dir = std::path::PathBuf::from(&home_dir)
            .join("Library")
            .join("Application Support")
            .join(app_name);

        #[cfg(target_os = "windows")]
        let app_support_dir = std::path::PathBuf::from(&home_dir)
            .join("AppData")
            .join("Roaming")
            .join(app_name);

        #[cfg(target_os = "linux")]
        let app_support_dir = std::path::PathBuf::from(&home_dir)
            .join(".config")
            .join(app_name);

        // Create the directory if it doesn't exist
        std::fs::create_dir_all(&app_support_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        let db_path = app_support_dir.join("database.db");
        Ok(db_path.to_string_lossy().to_string())
    }
}

// Open Terminal.app with a command (shows Terminal window)
pub fn open_terminal_with_command(command: String) {
    println!("open_terminal_with_command called with: {}", command);

    #[cfg(target_os = "macos")]
    {
        let home_dir = dirs::home_dir().unwrap_or_default();
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

        // Create a temporary script file to avoid complex quoting issues
        let temp_dir = std::env::temp_dir();
        let script_path = temp_dir.join(format!("tauri_script_{}.sh", std::process::id()));

        let script_content = format!("#!/bin/bash\ncd '{}'\n{}\n", home_dir.display(), command);

        // Write the script file
        if let Err(e) = std::fs::write(&script_path, script_content) {
            eprintln!("Failed to write script file: {:?}", e);
            return;
        }

        // Make it executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Err(e) =
                std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755))
            {
                eprintln!("Failed to set script permissions: {:?}", e);
                return;
            }
        }

        let script_path_str = script_path.to_string_lossy().to_string();

        // AppleScript that runs the script and closes the terminal window automatically
        let applescript = format!(
            r#"tell application "Terminal"
    set newTab to do script "{}; rm '{}'; exit"
    repeat
        delay 0.1
        if not busy of newTab then
            close (first window whose tabs contains newTab)
            exit repeat
        end if
    end repeat
end tell"#,
            script_path_str, script_path_str
        );

        println!("Running script via temporary file: {}", script_path_str);

        std::thread::spawn(move || {
            match Command::new("osascript")
                .arg("-e")
                .arg(&applescript)
                .output()
            {
                Ok(output) => {
                    println!("Terminal opened successfully");
                    if !output.stdout.is_empty() {
                        println!("stdout: {}", String::from_utf8_lossy(&output.stdout));
                    }
                    if !output.stderr.is_empty() {
                        eprintln!("stderr: {}", String::from_utf8_lossy(&output.stderr));
                    }
                }
                Err(e) => eprintln!("Failed to open Terminal: {:?}", e),
            }
        });
    }

    #[cfg(target_os = "windows")]
    {
        // For Windows, open cmd with the command
        std::thread::spawn(
            move || match Command::new("cmd").args(&["/K", &command]).spawn() {
                Ok(_) => println!("CMD opened successfully"),
                Err(e) => eprintln!("Failed to open CMD: {:?}", e),
            },
        );
    }

    #[cfg(target_os = "linux")]
    {
        // For Linux, try to use gnome-terminal or xterm
        std::thread::spawn(move || {
            let terminal_result = Command::new("gnome-terminal")
                .arg("--")
                .arg("bash")
                .arg("-c")
                .arg(&format!("{}; exec bash", command))
                .spawn();

            match terminal_result {
                Ok(_) => println!("Terminal opened successfully"),
                Err(_) => {
                    // Fallback to xterm
                    match Command::new("xterm")
                        .arg("-e")
                        .arg(&format!("bash -c '{}; exec bash'", command))
                        .spawn()
                    {
                        Ok(_) => println!("xterm opened successfully"),
                        Err(e) => eprintln!("Failed to open terminal: {:?}", e),
                    }
                }
            }
        });
    }
}

// Execute command silently in background (for automation)
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

#[cfg(not(debug_assertions))]
fn start_spring_boot_backend(app_handle: tauri::AppHandle, port: u16) -> Result<(), String> {
    println!("Starting Spring Boot backend on port {}...", port);

    // Get the database path
    let db_path = get_database_path(&app_handle)?;
    println!("Database path: {}", db_path);

    // Get the path to the backend-spring directory
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    // Tauri places bundled resources in a "resources" subdirectory
    let backend_dir = resource_path.join("resources").join("backend-spring");
    println!("Backend directory: {:?}", backend_dir);

    // Use the bundled GraalVM native image (this function is only called in production mode)
    let native_binary = backend_dir.join("backend-native");

    println!(
        "Production mode: Using native binary at {:?}",
        native_binary
    );

    // Verify native binary exists
    if !native_binary.exists() {
        return Err(format!("Native binary not found at {:?}", native_binary));
    }

    // Use GraalVM native image (no Java required!)
    let child = Command::new(&native_binary)
        .arg(format!("--server.port={}", port))
        .arg(format!("--spring.datasource.url=jdbc:sqlite:{}", db_path))
        .spawn()
        .map_err(|e| format!("Failed to start Spring Boot backend: {}", e))?;

    // Store the process handle
    if let Some(process_mutex) = SPRING_BOOT_PROCESS.get() {
        *process_mutex.lock().unwrap() = Some(child);
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

// Initialize runtime handle for async operations
fn init_runtime() -> Result<(), String> {
    let runtime = tokio::runtime::Runtime::new()
        .map_err(|e| format!("Failed to create Tokio runtime: {}", e))?;
    RT_HANDLE
        .set(runtime.handle().clone())
        .map_err(|_| "Failed to set runtime handle".to_string())?;
    Ok(())
}

// Initialize database with Prisma
pub fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    // Get the appropriate database path
    let db_path = get_database_path(app_handle)?;
    println!("Database location: {}", db_path);

    // Set DATABASE_URL environment variable for Prisma
    let database_url = format!("file:{}", db_path);
    std::env::set_var("DATABASE_URL", &database_url);

    // Initialize Prisma client and run migrations to create database
    let rt_handle = RT_HANDLE
        .get()
        .ok_or_else(|| "Runtime not initialized".to_string())?;

    // Use a separate thread to avoid async runtime conflicts
    let database_url_clone = database_url.clone();
    std::thread::spawn(move || {
        // Ensure DATABASE_URL is set in this thread too
        std::env::set_var("DATABASE_URL", &database_url_clone);

        let rt = tokio::runtime::Runtime::new().expect("Failed to create runtime");
        rt.block_on(async move {
            println!(
                "Initializing Prisma client with database: {}",
                database_url_clone
            );
            let client = prisma::new_client_with_url(&database_url_clone)
                .await
                .expect("Failed to create Prisma client");

            // Always run schema sync to ensure database matches current schema
            // This allows automatic schema updates when the app is updated
            println!("Syncing database schema...");
            client
                ._db_push()
                .accept_data_loss()
                .await
                .expect("Failed to sync database schema");
            println!("Database schema synced successfully");

            PRISMA_CLIENT
                .set(client)
                .expect("Failed to set Prisma client");

            println!("Database initialized successfully");
        });
    })
    .join()
    .map_err(|_| "Failed to initialize database".to_string())?;

    Ok(())
}

// Find an available port in the range 10000-60000
#[cfg(not(debug_assertions))]
fn find_available_port() -> Result<u16, String> {
    use rand::Rng;
    use std::net::TcpListener;
    let mut rng = rand::thread_rng();

    // Try up to 100 random ports
    for _ in 0..100 {
        let port = rng.gen_range(10000..=60000);
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }

    Err("Could not find an available port in range 10000-60000".to_string())
}

// Initialize Spring Boot process storage and conditionally start backend
fn init_spring_boot(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Initialize Spring Boot process storage
    SPRING_BOOT_PROCESS
        .set(Arc::new(Mutex::new(None)))
        .map_err(|_| "Failed to initialize Spring Boot process storage".to_string())?;

    // Determine port based on build mode
    #[cfg(debug_assertions)]
    let port = 7070; // Fixed port for development

    #[cfg(not(debug_assertions))]
    let port = find_available_port()?; // Random port for production

    BACKEND_PORT
        .set(port)
        .map_err(|_| "Failed to set backend port".to_string())?;
    println!("Backend will use port: {}", port);

    // Start Spring Boot backend (only in production mode)
    #[cfg(not(debug_assertions))]
    {
        println!("Production mode: Auto-starting Spring Boot backend...");
        std::thread::spawn(move || {
            if let Err(e) = start_spring_boot_backend(app_handle, port) {
                eprintln!("Failed to start Spring Boot backend: {}", e);
            }
        });
    }

    #[cfg(debug_assertions)]
    {
        println!("Development mode: Please start Spring Boot manually from IntelliJ");
        println!("Run the Application.kt file or use 'bootRun' Gradle task");
        println!("Use port: {}", port);
    }

    Ok(())
}

// Setup macOS window appearance
#[cfg(target_os = "macos")]
fn setup_macos_window(app: &tauri::App) {
    use cocoa::appkit::{NSWindow, NSWindowButton, NSWindowStyleMask, NSWindowTitleVisibility};
    use cocoa::base::{id, nil, YES};

    if let Some(window) = app.get_webview_window("main") {
        unsafe {
            if let Ok(ns_window) = window.ns_window() {
                let ns_window = ns_window as id;

                // Make title bar transparent and blended
                ns_window.setTitlebarAppearsTransparent_(YES);
                ns_window.setTitleVisibility_(NSWindowTitleVisibility::NSWindowTitleHidden);

                // Enable full size content view
                let mut style_mask = ns_window.styleMask();
                style_mask |= NSWindowStyleMask::NSFullSizeContentViewWindowMask;
                ns_window.setStyleMask_(style_mask);

                // Hide native traffic light buttons (we use custom ones)
                let close_button =
                    ns_window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
                let miniaturize_button =
                    ns_window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
                let zoom_button =
                    ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

                if close_button != nil {
                    let _: () = msg_send![close_button, setHidden: YES];
                }

                if miniaturize_button != nil {
                    let _: () = msg_send![miniaturize_button, setHidden: YES];
                }

                if zoom_button != nil {
                    let _: () = msg_send![zoom_button, setHidden: YES];
                }
            }
        }
    }
}

// Setup macOS menu with keyboard shortcuts
#[cfg(target_os = "macos")]
fn setup_macos_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, Submenu};

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
    let dark_mode_toggle = MenuItemBuilder::with_id("toggle_dark_mode", "Toggle Dark Mode")
        .accelerator("Cmd+Shift+D")
        .build(app)?;

    let view_menu = Submenu::with_items(app, "View", true, &[&dark_mode_toggle])?;

    // App menu with Quit (this appears first with the app name on macOS)
    let quit = PredefinedMenuItem::quit(app, None)?;

    let app_menu = Submenu::with_items(app, "Shell Script Manager", true, &[&quit])?;

    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .build()?;

    app.set_menu(menu)?;

    Ok(())
}

// Handle menu events
#[cfg(target_os = "macos")]
fn setup_menu_handlers(app: &tauri::App) {
    use tauri::Emitter;

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
    });
}

// Open DevTools in debug mode
#[cfg(debug_assertions)]
fn open_devtools(app: &tauri::App) {
    let windows = app.webview_windows();
    if let Some(window) = windows.values().next() {
        window.open_devtools();
    }
}
