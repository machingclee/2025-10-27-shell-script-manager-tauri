-- SQL to remove the foreign key columns that were added

-- SQLite doesn't support DROP COLUMN directly in older versions
-- We need to recreate the tables without those columns

-- Step 1: Recreate shell_script table without folder_id
CREATE TABLE shell_script_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    ordering INTEGER NOT NULL,
    created_at REAL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours'))),
    show_shell BOOLEAN DEFAULT false
);

-- Step 2: Copy data from old table to new table
INSERT INTO shell_script_new (id, name, command, ordering, created_at, created_at_hk, show_shell)
SELECT id, name, command, ordering, created_at, created_at_hk, show_shell
FROM shell_script;

-- Step 3: Drop old table and rename new table
DROP TABLE shell_script;
ALTER TABLE shell_script_new RENAME TO shell_script;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_shell_script_id ON shell_script(id);

-- Step 5: Recreate scripts_folder table without parent_folder_id
CREATE TABLE scripts_folder_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ordering INTEGER NOT NULL,
    created_at REAL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL)),
    created_at_hk TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', datetime('now', '+8 hours')))
);

-- Step 6: Copy data from old table to new table
INSERT INTO scripts_folder_new (id, name, ordering, created_at, created_at_hk)
SELECT id, name, ordering, created_at, created_at_hk
FROM scripts_folder;

-- Step 7: Drop old table and rename new table
DROP TABLE scripts_folder;
ALTER TABLE scripts_folder_new RENAME TO scripts_folder;

-- Step 8: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_scripts_folder_id ON scripts_folder(id);

-- Done!
SELECT 'Foreign key columns removed successfully!' as status;

