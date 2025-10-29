use crate::prisma::PrismaClient;

pub fn get_db() -> &'static PrismaClient {
    crate::PRISMA_CLIENT.get().unwrap()
}

pub async fn initialize_database(client: &PrismaClient) -> Result<(), Box<dyn std::error::Error>> {
    println!("Initializing database...");

    // Apply all migrations programmatically
    match client._migrate_deploy().await {
        Ok(_) => {
            println!("Database initialized successfully");
        }
        Err(e) => {
            println!(
                "Migration failed, checking if database is already initialized: {}",
                e
            );
            // Check if database is already initialized
            match client.scripts_folder().count(vec![]).exec().await {
                Ok(_) => {
                    println!("Database appears to be already initialized");
                }
                Err(_) => {
                    return Err("Database initialization failed".into());
                }
            }
        }
    }

    Ok(())
}
