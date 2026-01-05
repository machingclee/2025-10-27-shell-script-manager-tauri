-- CreateTable
CREATE TABLE "application_state" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "last_opened_folder_id" INTEGER,
    "dark_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "scripts_folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "rel_scriptsfolder_shellscript" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scripts_folder_id" INTEGER NOT NULL,
    "shell_script_id" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "rel_scriptsfolder_shellscript_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_scriptsfolder_shellscript_scripts_folder_id_fkey" FOREIGN KEY ("scripts_folder_id") REFERENCES "scripts_folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shell_script" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "is_markdown" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    "show_shell" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "rel_folder_folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parent_folder_id" INTEGER NOT NULL,
    "child_folder_id" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "rel_folder_folder_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "scripts_folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_folder_folder_child_folder_id_fkey" FOREIGN KEY ("child_folder_id") REFERENCES "scripts_folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "rel_workspace_folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workspace_id" INTEGER NOT NULL,
    "folder_id" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "rel_workspace_folder_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rel_workspace_folder_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "scripts_folder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "historical_shell_script" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shell_script_id" INTEGER NOT NULL,
    "execution_time" REAL NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "request_id" TEXT NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    "event_type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "request_user_email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "ai_profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "selected_model_config_id" INTEGER,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "ai_profile_selected_model_config_id_fkey" FOREIGN KEY ("selected_model_config_id") REFERENCES "model_config" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "script_ai_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enabled_ai_search" BOOLEAN NOT NULL DEFAULT false,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "rel_shellscript_aiconfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shell_script_id" INTEGER NOT NULL,
    "script_ai_config_id" INTEGER NOT NULL,
    CONSTRAINT "rel_shellscript_aiconfig_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_shellscript_aiconfig_script_ai_config_id_fkey" FOREIGN KEY ("script_ai_config_id") REFERENCES "script_ai_config" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "model_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "model_source" TEXT NOT NULL DEFAULT 'AZURE_OPENAI',
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- CreateTable
CREATE TABLE "rel_aiprofile_modelconfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ai_profile_id" INTEGER NOT NULL,
    "model_config_id" INTEGER NOT NULL,
    CONSTRAINT "rel_aiprofile_modelconfig_ai_profile_id_fkey" FOREIGN KEY ("ai_profile_id") REFERENCES "ai_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_aiprofile_modelconfig_model_config_id_fkey" FOREIGN KEY ("model_config_id") REFERENCES "model_config" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "azure_model_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "model_config_id" INTEGER NOT NULL,
    "azure_openai_api_key" TEXT NOT NULL,
    "azure_openai_endpoint" TEXT NOT NULL,
    "azure_openai_api_version" TEXT NOT NULL,
    "azure_openai_model" TEXT NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "azure_model_config_model_config_id_fkey" FOREIGN KEY ("model_config_id") REFERENCES "model_config" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "openai_model_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "model_config_id" INTEGER NOT NULL,
    "openai_api_key" TEXT NOT NULL,
    "openai_model" TEXT NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "openai_model_config_model_config_id_fkey" FOREIGN KEY ("model_config_id") REFERENCES "model_config" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_scripted_tool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tool_description" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "shell_script_id" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "ai_scripted_tool_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rel_aiprofile_aiscriptedtool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ai_profile_id" INTEGER NOT NULL,
    "ai_scripted_tool_id" INTEGER NOT NULL,
    CONSTRAINT "rel_aiprofile_aiscriptedtool_ai_profile_id_fkey" FOREIGN KEY ("ai_profile_id") REFERENCES "ai_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_aiprofile_aiscriptedtool_ai_scripted_tool_id_fkey" FOREIGN KEY ("ai_scripted_tool_id") REFERENCES "ai_scripted_tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "scripts_folder_id_idx" ON "scripts_folder"("id");

-- CreateIndex
CREATE INDEX "rel_scriptsfolder_shellscript_scripts_folder_id_idx" ON "rel_scriptsfolder_shellscript"("scripts_folder_id");

-- CreateIndex
CREATE INDEX "rel_scriptsfolder_shellscript_shell_script_id_idx" ON "rel_scriptsfolder_shellscript"("shell_script_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_scriptsfolder_shellscript_shell_script_id_scripts_folder_id_key" ON "rel_scriptsfolder_shellscript"("shell_script_id", "scripts_folder_id");

-- CreateIndex
CREATE INDEX "shell_script_id_idx" ON "shell_script"("id");

-- CreateIndex
CREATE INDEX "rel_folder_folder_parent_folder_id_idx" ON "rel_folder_folder"("parent_folder_id");

-- CreateIndex
CREATE INDEX "rel_folder_folder_child_folder_id_idx" ON "rel_folder_folder"("child_folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_folder_folder_parent_folder_id_child_folder_id_key" ON "rel_folder_folder"("parent_folder_id", "child_folder_id");

-- CreateIndex
CREATE INDEX "workspace_id_idx" ON "workspace"("id");

-- CreateIndex
CREATE INDEX "rel_workspace_folder_workspace_id_idx" ON "rel_workspace_folder"("workspace_id");

-- CreateIndex
CREATE INDEX "rel_workspace_folder_folder_id_idx" ON "rel_workspace_folder"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "rel_workspace_folder_workspace_id_folder_id_key" ON "rel_workspace_folder"("workspace_id", "folder_id");

-- CreateIndex
CREATE INDEX "historical_shell_script_shell_script_id_idx" ON "historical_shell_script"("shell_script_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_id_key" ON "event"("id");

