# SQLite Foreign Keys and CASCADE Deletion Guide

## Overview

SQLite has **foreign keys disabled by default**, unlike PostgreSQL or MySQL. This behavior requires explicit configuration in every database connection to enable CASCADE deletion and other foreign key constraints.

## Key Concepts

### 1. Foreign Keys Are OFF by Default

```sql
-- Default SQLite behavior
PRAGMA foreign_keys;  -- Returns 0 (disabled)
```

### 2. Two Requirements for CASCADE Deletion

**Requirement A: CASCADE in Table Structure** (at creation time)

```sql
CREATE TABLE "rel_aiprofile_modelconfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ai_profile_id" INTEGER NOT NULL,
    "model_config_id" INTEGER NOT NULL,
    CONSTRAINT "rel_aiprofile_modelconfig_ai_profile_id_fkey"
        FOREIGN KEY ("ai_profile_id")
        REFERENCES "ai_profile" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rel_aiprofile_modelconfig_model_config_id_fkey"
        FOREIGN KEY ("model_config_id")
        REFERENCES "model_config" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
)
```

**Requirement B: Foreign Keys Enabled in Connection** (per-connection setting)

```sql
PRAGMA foreign_keys = ON;
```

### 3. Each Connection is Independent

- Tauri/Prisma connection: Needs `foreign_keys=true`
- Spring Boot JDBC connection: Needs `foreign_keys=true`
- TablePlus/SQL clients: Need Bootstrap commands or manual PRAGMA

---

## Implementation Guide

### Tauri/Prisma (Rust)

#### 1. Prisma Schema Configuration

**File:** `src-tauri/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../database.db?connection_limit=1&socket_timeout=10&foreign_keys=true"
}

model model_config {
  id                         Int     @id @default(autoincrement())
  model_source               String  // Enum values: OPENAI, AZURE_OPENAI
  name                       String
  description                String?
  azure_model_config         azure_model_config?
  openai_model_config        openai_model_config?
  rel_aiprofile_modelconfig  rel_aiprofile_modelconfig[]
}

model rel_aiprofile_modelconfig {
  id              Int           @id @default(autoincrement())
  ai_profile_id   Int
  model_config_id Int
  ai_profile      ai_profile    @relation(fields: [ai_profile_id], references: [id], onDelete: Cascade)
  model_config    model_config  @relation(fields: [model_config_id], references: [id], onDelete: Cascade)
}
```

**Key Points:**

- `foreign_keys=true` in connection URL automatically executes `PRAGMA foreign_keys = ON`
- `onDelete: Cascade` in relations ensures CASCADE is baked into CREATE TABLE statements

#### 2. Rust Initialization Code

**File:** `src-tauri/src/lib.rs`

```rust
pub fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let db_path = get_database_path(app_handle)?;

    // Include foreign_keys=true to enable CASCADE deletion
    let database_url = format!(
        "file:{}?connection_limit=1&socket_timeout=10&foreign_keys=true",
        db_path
    );
    std::env::set_var("DATABASE_URL", &database_url);

    // ... (rest of initialization)

    let client = prisma::new_client_with_url(&database_url).await?;

    // Explicit PRAGMA execution (redundant with connection parameter, but confirms)
    client
        ._execute_raw(prisma_client_rust::raw!("PRAGMA foreign_keys = ON"))
        .exec()
        .await?;

    // Verify foreign keys are enabled
    let fk_status: i32 = client
        ._query_raw(prisma_client_rust::raw!("PRAGMA foreign_keys"))
        .exec()
        .await?
        .into_iter()
        .next()
        .and_then(|row: serde_json::Value|
            row.get("foreign_keys").and_then(|v| v.as_i64()))
        .unwrap_or(0) as i32;

    if fk_status != 1 {
        panic!("Failed to enable foreign key constraints!");
    }

    // Sync schema with database
    client._db_push().accept_data_loss().await?;

    Ok(())
}
```

---

### Spring Boot (Kotlin/JPA)

#### Configuration Options

**Option 1: Connection URL in application.properties**

**File:** `backend-spring/src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:sqlite:../database.db?foreign_keys=true
```

**Option 2: DataSource Configuration Class**

```kotlin
@Configuration
class DataSourceConfig {
    @Bean
    fun dataSource(): DataSource {
        val dataSource = SQLiteDataSource()
        dataSource.url = "jdbc:sqlite:../database.db"

        // Enable foreign keys for all connections from this pool
        dataSource.config.toProperties().apply {
            setProperty(SQLiteConfig.Pragma.FOREIGN_KEYS.pragmaName, "true")
        }

        return dataSource
    }
}
```

**Option 3: Production Build Command Line Argument**

**File:** `src-tauri/src/lib.rs` (production mode)

```rust
let child = Command::new(&native_binary)
    .arg(format!("--server.port={}", port))
    .arg(format!("--spring.datasource.url=jdbc:sqlite:{}?foreign_keys=true", db_path))
    .spawn()?;
```

---

### TablePlus (SQL Client)

#### Using Bootstrap Commands (Recommended)

1. Open TablePlus connection dialog
2. Click **"Bootstrap commands..."** button
3. Add the following command:

```sql
PRAGMA foreign_keys = ON;
```

4. Click "Save"
5. Click "Connect"

This command will run automatically every time TablePlus connects.

#### Manual Execution (Per Session)

Run this in the SQL editor before testing deletions:

```sql
PRAGMA foreign_keys = ON;

-- Now test CASCADE deletion
DELETE FROM model_config WHERE id = 1;

-- Verify related records were deleted
SELECT * FROM rel_aiprofile_modelconfig WHERE model_config_id = 1;  -- Should return 0 rows
```

---

## Testing CASCADE Deletion

### Verify Table Structure

Check that CASCADE is in the CREATE TABLE statement:

```sql
SELECT sql FROM sqlite_master
WHERE type='table' AND name='rel_aiprofile_modelconfig';
```

Expected output should contain:

```sql
ON DELETE CASCADE ON UPDATE CASCADE
```

### Verify Foreign Keys Are Enabled

```sql
PRAGMA foreign_keys;
```

Expected output: `1` (enabled)

### Test CASCADE Deletion

```sql
-- Insert test data
INSERT INTO model_config (id, model_source, name) VALUES (999, 'OPENAI', 'Test Model');
INSERT INTO rel_aiprofile_modelconfig (ai_profile_id, model_config_id) VALUES (1, 999);

-- Verify relationship exists
SELECT * FROM rel_aiprofile_modelconfig WHERE model_config_id = 999;

-- Delete parent record (should CASCADE to child)
DELETE FROM model_config WHERE id = 999;

-- Verify child record was deleted automatically
SELECT * FROM rel_aiprofile_modelconfig WHERE model_config_id = 999;  -- Should return 0 rows
```

---

## Common Issues and Solutions

### Issue 1: CASCADE Not Working

**Symptoms:** Deleting parent records doesn't delete child records

**Causes:**

1. Foreign keys not enabled in connection
2. Tables created before CASCADE was added to schema

**Solutions:**

1. Add `foreign_keys=true` to connection URL
2. Add Bootstrap commands in SQL client
3. Delete database and let app recreate it with CASCADE constraints

### Issue 2: Tables Created Without CASCADE

**Symptoms:** CREATE TABLE statement doesn't show `ON DELETE CASCADE`

**Cause:** Tables were created before `onDelete: Cascade` was added to Prisma schema

**Solution:**

```bash
# Delete the database file
rm src-tauri/database.db

# Restart app - it will recreate tables with CASCADE constraints
# On startup, _db_push() will CREATE tables with proper CASCADE
```

### Issue 3: Different Connections Have Different Settings

**Symptoms:** CASCADE works in app but not in TablePlus

**Cause:** Each database connection has independent PRAGMA settings

**Solution:** Configure foreign keys in **every** connection:

- Tauri: `foreign_keys=true` in connection URL
- Spring Boot: `foreign_keys=true` in JDBC URL
- TablePlus: Bootstrap commands

---

## Best Practices

### 1. Always Use Connection Parameters

```
file:path/to/database.db?foreign_keys=true
```

### 2. Verify on Startup

```rust
// Check and log foreign key status
let fk_status = PRAGMA foreign_keys;
println!("Foreign key status: {}", fk_status);  // Should be 1
```

### 3. Define CASCADE in Schema

```prisma
model child {
  parent_id Int
  parent    parent @relation(fields: [parent_id], references: [id], onDelete: Cascade)
}
```

### 4. Test CASCADE Behavior

Write integration tests that verify CASCADE deletion works as expected.

---

## Summary

✅ **SQLite foreign keys are OFF by default** - must enable explicitly  
✅ **CASCADE requires two things:**

- CASCADE in CREATE TABLE statement (defined in Prisma schema with `onDelete: Cascade`)
- Foreign keys enabled in connection (via `foreign_keys=true` parameter)  
  ✅ **Each connection is independent** - Tauri, Spring Boot, and TablePlus each need configuration  
  ✅ **Connection parameter automatically runs PRAGMA** - `foreign_keys=true` executes `PRAGMA foreign_keys = ON`  
  ✅ **Existing tables may need recreation** - if tables were created before CASCADE was added to schema

---

## References

- [SQLite Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [SQLite PRAGMA foreign_keys](https://www.sqlite.org/pragma.html#pragma_foreign_keys)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [JDBC SQLite Configuration](https://github.com/xerial/sqlite-jdbc#configuration)
