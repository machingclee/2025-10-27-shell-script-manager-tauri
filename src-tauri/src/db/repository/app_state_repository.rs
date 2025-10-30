use crate::prisma::PrismaClient;
use crate::PRISMA_CLIENT;

pub struct AppStateRepository {}

impl AppStateRepository {
    pub fn new() -> Self {
        Self {}
    }

    fn get_client(&self) -> &'static PrismaClient {
        PRISMA_CLIENT
            .get()
            .expect("Prisma client not initialized")
    }

    pub async fn get_app_state(&self) -> Result<Option<crate::prisma::application_state::Data>, Box<dyn std::error::Error>> {
        let client = self.get_client();
        
        let state = client
            .application_state()
            .find_first(vec![])
            .exec()
            .await?;
        
        Ok(state)
    }

    pub async fn set_last_opened_folder(&self, folder_id: Option<i32>) -> Result<crate::prisma::application_state::Data, Box<dyn std::error::Error>> {
        let client = self.get_client();
        
        // Check if state exists
        let existing = self.get_app_state().await?;
        
        if let Some(state) = existing {
            // Update existing state
            let updated = client
                .application_state()
                .update(
                    crate::prisma::application_state::id::equals(state.id),
                    vec![
                        crate::prisma::application_state::last_opened_folder_id::set(folder_id),
                    ],
                )
                .exec()
                .await?;
            
            Ok(updated)
        } else {
            // Create new state
            let created = client
                .application_state()
                .create(
                    vec![
                        crate::prisma::application_state::last_opened_folder_id::set(folder_id),
                    ],
                )
                .exec()
                .await?;
            
            Ok(created)
        }
    }

    pub async fn set_dark_mode(&self, enabled: bool) -> Result<crate::prisma::application_state::Data, Box<dyn std::error::Error>> {
        let client = self.get_client();
        
        // Check if state exists
        let existing = self.get_app_state().await?;
        
        if let Some(state) = existing {
            // Update existing state
            let updated = client
                .application_state()
                .update(
                    crate::prisma::application_state::id::equals(state.id),
                    vec![
                        crate::prisma::application_state::dark_mode::set(enabled),
                    ],
                )
                .exec()
                .await?;
            
            Ok(updated)
        } else {
            // Create new state with dark mode
            let created = client
                .application_state()
                .create(
                    vec![
                        crate::prisma::application_state::dark_mode::set(enabled),
                    ],
                )
                .exec()
                .await?;
            
            Ok(created)
        }
    }
}

