-- ========================================
-- Fix Duplicate Rows in Join Tables
-- ========================================

-- Step 1: Check for duplicates in rel_scriptsfolder_shellscript
SELECT 
    shell_script_id, 
    scripts_folder_id, 
    COUNT(*) as count
FROM rel_scriptsfolder_shellscript
GROUP BY shell_script_id, scripts_folder_id
HAVING COUNT(*) > 1;

-- Step 2: Check for duplicates in rel_folder_folder
SELECT 
    parent_folder_id, 
    child_folder_id, 
    COUNT(*) as count
FROM rel_folder_folder
GROUP BY parent_folder_id, child_folder_id
HAVING COUNT(*) > 1;

-- Step 3: Delete duplicates from rel_scriptsfolder_shellscript (keep the oldest/smallest id)
DELETE FROM rel_scriptsfolder_shellscript
WHERE id NOT IN (
    SELECT MIN(id)
    FROM rel_scriptsfolder_shellscript
    GROUP BY shell_script_id, scripts_folder_id
);

-- Step 4: Delete duplicates from rel_folder_folder (keep the oldest/smallest id)
DELETE FROM rel_folder_folder
WHERE id NOT IN (
    SELECT MIN(id)
    FROM rel_folder_folder
    GROUP BY parent_folder_id, child_folder_id
);

-- Step 5: Create unique index on rel_scriptsfolder_shellscript to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_script_folder 
ON rel_scriptsfolder_shellscript(shell_script_id, scripts_folder_id);

-- Step 6: Create unique index on rel_folder_folder to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_parent_child_folder 
ON rel_folder_folder(parent_folder_id, child_folder_id);

-- Step 7: Verify no duplicates remain in rel_scriptsfolder_shellscript
SELECT 
    shell_script_id, 
    scripts_folder_id, 
    COUNT(*) as count
FROM rel_scriptsfolder_shellscript
GROUP BY shell_script_id, scripts_folder_id
HAVING COUNT(*) > 1;

-- Step 8: Verify no duplicates remain in rel_folder_folder
SELECT 
    parent_folder_id, 
    child_folder_id, 
    COUNT(*) as count
FROM rel_folder_folder
GROUP BY parent_folder_id, child_folder_id
HAVING COUNT(*) > 1;

