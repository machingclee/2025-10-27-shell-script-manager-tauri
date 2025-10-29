// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod db;
mod handler_command;
mod prisma;

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

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
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
async fn create_folder(request: CreateFolderRequest) -> Result<Folder, String> {
    let repo = FolderRepository::new();

    // Get the count to determine the next ordering
    let count = repo.get_folder_count().await;

    let folder = repo
        .create_script_folder(&request.name, count as i32)
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
async fn get_scripts_by_folder(folder_id: i32) -> Result<Vec<Script>, String> {
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
async fn create_script(request: CreateScriptRequest) -> Result<Script, String> {
    let repo = ScriptRepository::new();

    let script = repo
        .create_script(request.name.clone(), request.content.clone())
        .await
        .map_err(|e| format!("Failed to create script: {}", e))?;

    // Create the relationship between script and folder
    repo.create_script_relationship(request.folder_id, script.id)
        .await
        .map_err(|e| format!("Failed to create script relationship: {}", e))?;

    Ok(Script {
        id: script.id,
        name: script.name,
        command: script.command,
    })
}

#[tauri::command]
async fn update_script(request: UpdateScriptRequest) -> Result<Script, String> {
    let repo = ScriptRepository::new();

    if let Some(name) = request.name {
        repo.update_script_name(request.id, name)
            .await
            .map_err(|e| format!("Failed to update script name: {}", e))?;
    }

    if let Some(content) = request.content {
        repo.update_script_command(request.id, content)
            .await
            .map_err(|e| format!("Failed to update script command: {}", e))?;
    }

    Ok(Script {
        id: request.id,
        name: String::new(),
        command: String::new(),
    })
}

#[tauri::command]
async fn delete_script(id: i32) -> Result<(), String> {
    let repo = ScriptRepository::new();
    repo.delete_script(id)
        .await
        .map_err(|e| format!("Failed to delete script: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn custom_command(name: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "message": format!("Hello, {}! Welcome to Tauri + Redux Toolkit!", name)
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            custom_command,
            get_all_folders,
            create_folder,
            delete_folder,
            get_scripts_by_folder,
            create_script,
            update_script,
            delete_script,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
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
