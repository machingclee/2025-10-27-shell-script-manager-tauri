use crate::prisma::PrismaClient;
use crate::prisma::shell_script::Data;

pub struct ScriptRepository {
    db: &'static PrismaClient,
}

impl ScriptRepository {
    pub fn new() -> Self {
        let db = crate::db::get_db::get_db();
        Self { db }
    }

    pub async fn create_script(
        &self,
        name: String,
        command: String,
        ordering: i32,
    ) -> prisma_client_rust::Result<Data> {
        self.db
            .shell_script()
            .create(name, command, ordering, vec![])
            .exec()
            .await
    }

    pub async fn create_script_relationship(
        &self,
        folder_id: i32,
        script_id: i32,
    ) -> prisma_client_rust::Result<()> {
        self.db
            .rel_scriptsfolder_shellscript()
            .create(
                crate::prisma::shell_script::UniqueWhereParam::IdEquals(script_id),
                crate::prisma::scripts_folder::UniqueWhereParam::IdEquals(folder_id),
                vec![],
            )
            .exec()
            .await?;
        Ok(())
    }

    pub async fn update_script_command(
        &self,
        script_id: i32,
        new_command: String,
    ) -> prisma_client_rust::Result<()> {
        self.db
            .shell_script()
            .update_many(
                vec![crate::prisma::shell_script::id::equals(script_id)],
                vec![crate::prisma::shell_script::command::set(new_command)],
            )
            .exec()
            .await?;
        Ok(())
    }

    pub async fn update_script_name(
        &self,
        script_id: i32,
        new_name: String,
    ) -> prisma_client_rust::Result<()> {
        self.db
            .shell_script()
            .update_many(
                vec![crate::prisma::shell_script::id::equals(script_id)],
                vec![crate::prisma::shell_script::name::set(new_name)],
            )
            .exec()
            .await?;
        Ok(())
    }

    pub async fn get_scripts_by_folder(
        &self,
        folder_id: i32,
    ) -> prisma_client_rust::Result<Vec<Data>> {
        self.db
            .shell_script()
            .find_many(vec![
                crate::prisma::shell_script::rel_scriptsfolder_shellscript::some(vec![
                    crate::prisma::rel_scriptsfolder_shellscript::scripts_folder_id::equals(
                        folder_id,
                    ),
                ]),
            ])
            .order_by(crate::prisma::shell_script::ordering::order(
                prisma_client_rust::Direction::Asc,
            ))
            .exec()
            .await
    }

    pub async fn get_script_count_by_folder(&self, folder_id: i32) -> prisma_client_rust::Result<i64> {
        self.db
            .shell_script()
            .count(vec![
                crate::prisma::shell_script::rel_scriptsfolder_shellscript::some(vec![
                    crate::prisma::rel_scriptsfolder_shellscript::scripts_folder_id::equals(
                        folder_id,
                    ),
                ]),
            ])
            .exec()
            .await
    }

    pub async fn get_scripts_with_relations_by_folder(
        &self,
        folder_id: i32,
    ) -> prisma_client_rust::Result<Vec<crate::prisma::shell_script::Data>> {
        let scripts = self
            .db
            .shell_script()
            .find_many(vec![])
            .with(
                crate::prisma::shell_script::rel_scriptsfolder_shellscript::fetch(vec![
                    crate::prisma::rel_scriptsfolder_shellscript::scripts_folder_id::equals(
                        folder_id,
                    ),
                ]),
            )
            .exec()
            .await?;

        // Filter scripts that actually belong to this folder
        let folder_scripts: Vec<_> = scripts
            .into_iter()
            .filter(|script| {
                script
                    .rel_scriptsfolder_shellscript
                    .as_ref()
                    .map(|rels| !rels.is_empty())
                    .unwrap_or(false)
            })
            .collect();

        Ok(folder_scripts)
    }

    pub async fn delete_script(&self, script_id: i32, folder_id: i32) -> prisma_client_rust::Result<()> {
        // First delete the relationship record to avoid foreign key constraint error
        self.db
            .rel_scriptsfolder_shellscript()
            .delete_many(vec![
                crate::prisma::rel_scriptsfolder_shellscript::shell_script_id::equals(script_id),
            ])
            .exec()
            .await?;

        // Then delete the script itself
        self.db
            .shell_script()
            .delete_many(vec![crate::prisma::shell_script::id::equals(script_id)])
            .exec()
            .await?;

        // Reorder remaining scripts in the folder
        let remaining_scripts = self.get_scripts_by_folder(folder_id).await?;
        for (index, script) in remaining_scripts.iter().enumerate() {
            self.db
                .shell_script()
                .update_many(
                    vec![crate::prisma::shell_script::id::equals(script.id)],
                    vec![crate::prisma::shell_script::ordering::set(index as i32)],
                )
                .exec()
                .await?;
        }

        Ok(())
    }

    pub async fn reorder_scripts(
        &self,
        folder_id: i32,
        from_index: usize,
        to_index: usize,
    ) -> prisma_client_rust::Result<()> {
        let mut scripts = self.get_scripts_by_folder(folder_id).await?;
        
        if from_index >= scripts.len() || to_index >= scripts.len() {
            return Ok(());
        }

        // Reorder in memory
        let script = scripts.remove(from_index);
        scripts.insert(to_index, script);

        // Update ordering in database
        for (index, script) in scripts.iter().enumerate() {
            self.db
                .shell_script()
                .update_many(
                    vec![crate::prisma::shell_script::id::equals(script.id)],
                    vec![crate::prisma::shell_script::ordering::set(index as i32)],
                )
                .exec()
                .await?;
        }

        Ok(())
    }
}
