# Fix Duplicate Row Error

## Problem

You're getting `Duplicate row was found and ASSERT was specified` because your database has duplicate entries in the join tables from the previous incorrect JPA mappings.

## Solution Steps

### Step 1: Stop Your Spring Boot Application

Make sure the backend is not running before modifying the database.

### Step 2: Backup Your Database

```bash
cd src-tauri
cp database.db database.db.backup
```

### Step 3: Run the SQL Fix Script

**Option A: Using SQLite CLI**

```bash
cd src-tauri
sqlite3 database.db < ../backend-spring/fix-duplicates.sql
```

**Option B: Using a Database GUI Tool**

- Open `src-tauri/database.db` in a tool like DB Browser for SQLite, DBeaver, or DataGrip
- Run the SQL commands from `backend-spring/fix-duplicates.sql` one by one
- Check the results after each step

**Option C: Manual SQL Execution**

```bash
cd src-tauri
sqlite3 database.db

-- Then paste and run each command from fix-duplicates.sql
```

### Step 4: What the SQL Does

1. **Checks for duplicates** - Shows you how many duplicate rows exist
2. **Deletes duplicates** - Keeps only the oldest entry (smallest ID) for each unique relationship
3. **Creates unique indexes** - Prevents future duplicates from being created
4. **Verifies cleanup** - Confirms no duplicates remain

### Step 5: Restart Your Application

After running the SQL:

1. Restart your Spring Boot backend
2. Test moving scripts between folders
3. The error should now be gone!

## What Changed in the Code

### 1. Entity Mappings (ScriptsFolder.kt)

- Changed `@OneToMany` to use `mappedBy = "parentFolder"` instead of `@JoinTable`
- This tells Hibernate that the `@ManyToOne` side owns the relationship
- Prevents Hibernate from treating them as two separate relationships

### 2. Prisma Schema

Added unique constraints:

```prisma
@@unique([shell_script_id, scripts_folder_id])
@@unique([parent_folder_id, child_folder_id])
```

These prevent duplicate relationships at the database level.

## Verify the Fix

After applying the changes, you can verify there are no duplicates:

```sql
-- Should return no rows
SELECT shell_script_id, scripts_folder_id, COUNT(*) as count
FROM rel_scriptsfolder_shellscript
GROUP BY shell_script_id, scripts_folder_id
HAVING COUNT(*) > 1;

-- Should return no rows
SELECT parent_folder_id, child_folder_id, COUNT(*) as count
FROM rel_folder_folder
GROUP BY parent_folder_id, child_folder_id
HAVING COUNT(*) > 1;
```

## Troubleshooting

### If you still get the error:

1. Check if Spring Boot cached the old data - restart it
2. Verify the SQL actually ran - check the query results
3. Make sure you're using the updated `ScriptsFolder.kt` with `mappedBy`

### If you want to start fresh:

```bash
# Delete and recreate the database
cd src-tauri
rm database.db
# Then run your application - it will create a fresh database
```

## Prevention

The unique indexes we added will prevent this from happening again. Now if you try to create a duplicate relationship, you'll get a constraint violation instead of silent duplicates.
