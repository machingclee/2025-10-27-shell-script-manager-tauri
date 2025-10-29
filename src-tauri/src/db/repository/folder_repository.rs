use crate::prisma;
use crate::prisma::PrismaClient;
use crate::prisma::application_state::Data as AppStateData;
use crate::prisma::scripts_folder::Data;
use prisma_client_rust::QueryError;

pub struct FolderRepository {
    db: &'static PrismaClient,
}

pub struct FolderOrderUpdate {
    pub folder_id: i32,
    pub new_ordering: i32,
}

impl FolderRepository {
    pub fn new() -> Self {
        let db = crate::db::get_db::get_db();
        Self { db }
    }

    pub async fn get_folder_count(&self) -> i64 {
        let total_num_folders = self.db.scripts_folder().count(vec![]).exec().await.unwrap();
        total_num_folders
    }

    pub async fn get_all_folders(&self) -> prisma_client_rust::Result<Vec<Data>> {
        self.db
            .scripts_folder()
            .find_many(vec![])
            .order_by(crate::prisma::scripts_folder::ordering::order(
                prisma_client_rust::Direction::Asc,
            ))
            .exec()
            .await
    }

    pub async fn create_script_folder(
        &self,
        folder_name: &String,
        ordering: i32,
    ) -> prisma_client_rust::Result<Data> {
        self.db
            .scripts_folder()
            .create(folder_name.clone(), ordering, vec![])
            .exec()
            .await
    }

    pub async fn upsert_app_state_last_folder_id(
        &self,
        folder_id: i32,
    ) -> prisma_client_rust::Result<()> {
        self.db
            .application_state()
            .upsert(
                crate::prisma::application_state::id::equals(1),
                vec![crate::prisma::application_state::last_opened_folder_id::set(Some(folder_id))],
                vec![crate::prisma::application_state::last_opened_folder_id::set(Some(folder_id))],
            )
            .exec()
            .await?;
        Ok(())
    }

    pub async fn get_app_state(&self) -> prisma_client_rust::Result<Option<AppStateData>> {
        self.db.application_state().find_first(vec![]).exec().await
    }

    pub async fn delete_script_folder(&self, id: i32) -> Result<(), QueryError> {
        // 1. Find all scripts related to this folder
        let related_scripts = self
            .db
            .rel_scriptsfolder_shellscript()
            .find_many(vec![
                crate::prisma::rel_scriptsfolder_shellscript::scripts_folder_id::equals(id),
            ])
            .with(crate::prisma::rel_scriptsfolder_shellscript::shell_script::fetch())
            .exec()
            .await?;

        // 2. Delete relationship records first
        self.db
            .rel_scriptsfolder_shellscript()
            .delete_many(vec![
                crate::prisma::rel_scriptsfolder_shellscript::scripts_folder_id::equals(id),
            ])
            .exec()
            .await?;

        // 3. Delete scripts that are only used by this folder
        for relation in related_scripts {
            if let Some(script) = relation.shell_script {
                // Check if this script is used by other folders
                let other_relations = self
                    .db
                    .rel_scriptsfolder_shellscript()
                    .find_many(vec![
                        crate::prisma::rel_scriptsfolder_shellscript::shell_script_id::equals(
                            script.id,
                        ),
                    ])
                    .exec()
                    .await?;

                // Only delete if no other folders reference this script
                if other_relations.is_empty() {
                    self.db
                        .shell_script()
                        .delete_many(vec![crate::prisma::shell_script::id::equals(script.id)])
                        .exec()
                        .await?;
                }
            }
        }

        // 4. Finally delete the folder
        self.db
            .scripts_folder()
            .delete_many(vec![crate::prisma::scripts_folder::id::equals(id)])
            .exec()
            .await?;

        Ok(())
    }
    pub async fn reorder_folders(
        &self,
        from_index: usize,
        to_index: usize,
    ) -> Result<(), QueryError> {
        let mut folders = self.get_all_folders().await?;
        if from_index >= folders.len() || to_index >= folders.len() {
            return Ok(());
        }
        let folder = folders.remove(from_index);
        folders.insert(to_index, folder);

        for (ordering, folder) in folders.iter().enumerate() {
            self.db
                .scripts_folder()
                .update_many(
                    vec![crate::prisma::scripts_folder::id::equals(folder.id)],
                    vec![crate::prisma::scripts_folder::ordering::set(
                        ordering as i32,
                    )],
                )
                .exec()
                .await?;
        }
        Ok(())
    }

    pub async fn batch_order_update(
        &self,
        order_updates: Vec<FolderOrderUpdate>,
    ) -> Result<(), QueryError> {
        for (update) in order_updates {
            let folder_id = update.folder_id;
            let new_ordering = update.new_ordering;
            self.db
                .scripts_folder()
                .update_many(
                    vec![crate::prisma::scripts_folder::id::equals(folder_id)],
                    vec![crate::prisma::scripts_folder::ordering::set(new_ordering)],
                )
                .exec()
                .await?;
        }
        Ok(())
    }
}
