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
    CONSTRAINT "rel_scriptsfolder_shellscript_shell_script_id_fkey" FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rel_scriptsfolder_shellscript_scripts_folder_id_fkey" FOREIGN KEY ("scripts_folder_id") REFERENCES "scripts_folder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shell_script" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "created_at" REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    "created_at_hk" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);
