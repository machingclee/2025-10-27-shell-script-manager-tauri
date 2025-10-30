-- Initial schema migration
-- This represents the current state of the database

-- Application State table
CREATE TABLE IF NOT EXISTS application_state (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    last_opened_folder_id INTEGER,
    dark_mode BOOLEAN NOT NULL DEFAULT false,
    created_at REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- Scripts Folder table
CREATE TABLE IF NOT EXISTS scripts_folder (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ordering INTEGER NOT NULL,
    created_at REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

CREATE INDEX IF NOT EXISTS scripts_folder_id_idx ON scripts_folder(id);

-- Shell Script table
CREATE TABLE IF NOT EXISTS shell_script (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    ordering INTEGER NOT NULL,
    created_at REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

CREATE INDEX IF NOT EXISTS shell_script_id_idx ON shell_script(id);

-- Relationship table
CREATE TABLE IF NOT EXISTS rel_scriptsfolder_shellscript (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    scripts_folder_id INTEGER NOT NULL,
    shell_script_id INTEGER NOT NULL,
    created_at REAL NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    CONSTRAINT rel_scriptsfolder_shellscript_shell_script_id_fkey 
        FOREIGN KEY (shell_script_id) REFERENCES shell_script (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT rel_scriptsfolder_shellscript_scripts_folder_id_fkey 
        FOREIGN KEY (scripts_folder_id) REFERENCES scripts_folder (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS rel_scriptsfolder_shellscript_scripts_folder_id_idx 
    ON rel_scriptsfolder_shellscript(scripts_folder_id);
CREATE INDEX IF NOT EXISTS rel_scriptsfolder_shellscript_shell_script_id_idx 
    ON rel_scriptsfolder_shellscript(shell_script_id);

