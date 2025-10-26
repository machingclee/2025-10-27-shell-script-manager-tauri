-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_scripts_folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);
INSERT INTO "new_scripts_folder" ("created_at", "created_at_hk", "id", "name", "ordering") SELECT "created_at", "created_at_hk", "id", "name", "ordering" FROM "scripts_folder";
DROP TABLE "scripts_folder";
ALTER TABLE "new_scripts_folder" RENAME TO "scripts_folder";
CREATE INDEX "scripts_folder_id_idx" ON "scripts_folder"("id");
CREATE TABLE "new_rel_scriptsfolder_shellscript" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scripts_folder_id" INTEGER NOT NULL,
    "shell_script_id" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT "rel_scriptsfolder_shellscript_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rel_scriptsfolder_shellscript_scripts_folder_id_fkey" FOREIGN KEY ("scripts_folder_id") REFERENCES "scripts_folder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_rel_scriptsfolder_shellscript" ("created_at", "created_at_hk", "id", "scripts_folder_id", "shell_script_id") SELECT "created_at", "created_at_hk", "id", "scripts_folder_id", "shell_script_id" FROM "rel_scriptsfolder_shellscript";
DROP TABLE "rel_scriptsfolder_shellscript";
ALTER TABLE "new_rel_scriptsfolder_shellscript" RENAME TO "rel_scriptsfolder_shellscript";
CREATE INDEX "rel_scriptsfolder_shellscript_scripts_folder_id_idx" ON "rel_scriptsfolder_shellscript"("scripts_folder_id");
CREATE INDEX "rel_scriptsfolder_shellscript_shell_script_id_idx" ON "rel_scriptsfolder_shellscript"("shell_script_id");
CREATE TABLE "new_shell_script" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);
INSERT INTO "new_shell_script" ("command", "created_at", "created_at_hk", "id", "name", "ordering") SELECT "command", "created_at", "created_at_hk", "id", "name", "ordering" FROM "shell_script";
DROP TABLE "shell_script";
ALTER TABLE "new_shell_script" RENAME TO "shell_script";
CREATE INDEX "shell_script_id_idx" ON "shell_script"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
