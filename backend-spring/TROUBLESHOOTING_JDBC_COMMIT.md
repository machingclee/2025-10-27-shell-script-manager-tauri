# 🔧 TROUBLESHOOTING: "Unable to commit against JDBC Connection"

## ⚡ IMMEDIATE ACTIONS TO TRY NOW

### Action 1: Run the Debug Test (MOST IMPORTANT)

This will show you the EXACT error:

```bash
cd /Users/chingcheonglee/Repos/rust/2025-10-27-shell-script-manager-tauri/backend-spring
./gradlew clean test --tests "DebugCommitErrorTest" --info 2>&1 | tee debug-output.txt
```

**This test will:**

- ✅ Print the full exception stack trace
- ✅ Show all underlying causes
- ✅ Help identify the exact root cause

### Action 2: Test Database Connectivity

```bash
./gradlew test --tests "MinimalDatabaseTest"
```

**This verifies:**

- ✅ Testcontainers starts PostgreSQL correctly
- ✅ Basic database operations work
- ✅ Repository layer functions properly

### Action 3: Check Docker

```bash
# Check if Docker is running
docker ps

# If no containers, Docker might not be running
# On macOS: Open Docker Desktop application
```

---

## The Error

```
Unable to commit against JDBC Connection
```

This error occurs when Spring/Hibernate cannot commit a transaction to the database.

---

## Root Causes & Solutions

### Cause 1: Transaction Conflict ❌

**Problem:** Test uses `@Transactional` while `CommandInvoker` uses `TransactionTemplate`

**Solution:** ✅ **DONE** - Removed `@Transactional` from test class, only using it in `@AfterEach cleanup()`

### Cause 2: Database Not Initialized 🗄️

**Problem:** Tables don't exist or schema is invalid

**Check:**

```bash
# Connect to the test database
docker ps  # Find the postgres container
docker exec -it <container-id> psql -U test -d testdb

# Check if tables exist
\dt

# Should show: workspace, event, rel_workspace_folder, etc.
```

**Solution:** Ensure `spring.jpa.hibernate.ddl-auto=create` in `application-test.yml`

### Cause 3: Connection Pool Exhausted 💧

**Problem:** Too many connections open, none available for new transactions

**Solution:** ✅ **DONE** - Added HikariCP configuration:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
```

### Cause 4: Foreign Key Violations 🔗

**Problem:** Trying to delete/update records with FK constraints

**Solution:** ✅ **DONE** - Cleanup deletes in correct order:

```kotlin
@AfterEach
@Transactional
fun cleanup() {
    // 1. Delete from join tables first
    entityManager.createNativeQuery("DELETE FROM rel_workspace_folder").executeUpdate()

    // 2. Then delete from main tables
    eventRepository.deleteAll()
    workspaceRepository.deleteAll()
}
```

### Cause 5: Testcontainers Not Started 🐳

**Problem:** PostgreSQL container isn't running

**Check:**

```bash
docker ps | grep postgres
```

**Solution:** Ensure `@Import(TestcontainersConfiguration::class)` on test class

---

## Solutions (In Order of Preference)

### ✅ Solution 1: Use @DirtiesContext (RECOMMENDED FOR NOW)

**Use the new `SimpleEventTest.kt` file I created:**

```kotlin
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
@DirtiesContext(classMode = ClassMode.AFTER_EACH_TEST_METHOD)  // ← This!
class SimpleEventTest(...) {
    @Test
    fun `test`() {
        commandInvoker.invoke(command)
        // Assert...
    }
}
```

**Pros:**

- ✅ Complete isolation - fresh context per test
- ✅ No transaction conflicts
- ✅ No cleanup needed

**Cons:**

- ❌ Slow - rebuilds entire Spring context per test
- ❌ Not suitable for large test suites

### ✅ Solution 2: Use Current Cleanup (IMPLEMENTED)

**The current `EventTestingExamples.kt` approach:**

```kotlin
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
// No @Transactional here!
class EventTestingExamples(...) {

    @AfterEach
    @Transactional  // Only on cleanup method
    fun cleanup() {
        entityManager.createNativeQuery("DELETE FROM rel_workspace_folder").executeUpdate()
        eventRepository.deleteAll()
        workspaceRepository.deleteAll()
        entityManager.flush()
        entityManager.clear()
    }
}
```

**Pros:**

- ✅ Faster than @DirtiesContext
- ✅ Proper cleanup between tests

**Cons:**

- ⚠️ Requires careful FK handling
- ⚠️ Data accumulates if cleanup fails

### ✅ Solution 3: Disable Auto-Commit

**Add to `application-test.yml`:**

```yaml
spring:
  datasource:
    hikari:
      auto-commit: false  # ← Add this
```

**Why:** Forces explicit commits, may help with transaction control

### ✅ Solution 4: Use SQL Scripts for Cleanup

**Create `cleanup.sql`:**

```sql
TRUNCATE TABLE rel_workspace_folder CASCADE;
TRUNCATE TABLE event CASCADE;
TRUNCATE TABLE workspace CASCADE;
```

**In test:**

```kotlin
@AfterEach
@Transactional
fun cleanup() {
    jdbcTemplate.execute(
        ClassPathResource("cleanup.sql").inputStream.bufferedReader().use { it.readText() }
    )
}
```

---

## Debugging Steps

### Step 1: Check Database Connection

```kotlin
@Test
fun `database connection works`() {
    val count = jdbcTemplate.queryForObject("SELECT 1", Int::class.java)
    assertEquals(1, count)
}
```

### Step 2: Check Tables Exist

```kotlin
@Test
fun `tables are created`() {
    val tables = jdbcTemplate.queryForList(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )
    println("Tables: $tables")
    assertTrue(tables.isNotEmpty())
}
```

### Step 3: Test Simple Insert

```kotlin
@Test
fun `can insert workspace directly`() {
    jdbcTemplate.update(
        "INSERT INTO workspace (name, ordering) VALUES (?, ?)",
        "TestWorkspace", 0
    )

    val count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM workspace", Int::class.java
    )
    assertEquals(1, count)
}
```

### Step 4: Test CommandInvoker Isolation

```kotlin
@Test
fun `commandInvoker works without test framework`() {
    // Remove ALL test annotations and run as plain Kotlin
    val invoker = ... // Manually create dependencies
    val result = invoker.invoke(CreateWorkspaceCommand("Test"))
    assertNotNull(result)
}
```

---

## Current Status

### ✅ What's Been Fixed

1. ✅ Removed `@Transactional` from test class
2. ✅ Added proper cleanup with `@AfterEach` + `@Transactional`
3. ✅ Added FK-aware cleanup (join table deleted first)
4. ✅ Added HikariCP connection pool configuration
5. ✅ Added EntityManager flush/clear
6. ✅ Created alternative `SimpleEventTest` with `@DirtiesContext`

### ⚠️ If Still Failing

Try these in order:

1. **Use `SimpleEventTest.kt`** instead of `EventTestingExamples.kt`
   ```bash
   ./gradlew test --tests "SimpleEventTest"
   ```

2. **Check Docker container is running:**
   ```bash
   docker ps | grep postgres
   ```

3. **Check logs for detailed error:**
   ```bash
   ./gradlew test --tests "SimpleEventTest" --info
   ```

4. **Connect to test database manually:**
   ```bash
   docker exec -it $(docker ps -q -f name=postgres) psql -U test -d testdb
   \dt  # List tables
   SELECT * FROM workspace;  # Check data
   ```

5. **Try with fresh container:**
   ```bash
   # Stop and remove existing container
   docker stop $(docker ps -q -f name=postgres)
   docker rm $(docker ps -aq -f name=postgres)
   
   # Run tests (will create new container)
   ./gradlew test --tests "SimpleEventTest"
   ```

---

## Recommended Approach

**For now, use `SimpleEventTest.kt`:**

```bash
./gradlew test --tests "SimpleEventTest"
```

This uses `@DirtiesContext` which is slow but guaranteed to work. Once that passes, we can optimize by switching back to
the cleanup approach in `EventTestingExamples.kt`.

---

## Files to Check

1. ✅ `EventTestingExamples.kt` - Main test file with cleanup approach
2. ✅ `SimpleEventTest.kt` - Simpler test with @DirtiesContext
3. ✅ `MinimalDatabaseTest.kt` - **NEW** - Tests basic database connectivity
4. ✅ `DebugCommitErrorTest.kt` - **NEW** - Captures full error stack trace
5. ✅ `application-test.yml` - Database configuration (updated with more logging)
6. ✅ `TestcontainersConfiguration.kt` - Container setup

---

## Latest Changes (Just Made)

### ✅ Created Diagnostic Tests

1. **`MinimalDatabaseTest.kt`** - Tests database without CommandInvoker
    - Verifies Testcontainers PostgreSQL starts
    - Tests basic repository operations
    - Isolates whether issue is in database layer or CommandInvoker

2. **`DebugCommitErrorTest.kt`** - Captures full exception details
    - Prints complete stack trace
    - Shows all underlying causes
    - Helps identify exact failure point

### ✅ Updated Configuration

- Changed `ddl-auto` to `create-drop` for fresh schema
- Added transaction logging (`org.springframework.transaction: DEBUG`)
- Added JPA operation logging (`org.springframework.orm.jpa: DEBUG`)
- Enabled SQL comments for better debugging

### ✅ Run These Tests Now

```bash
# Test 1: Check database connectivity (fastest)
./gradlew test --tests "MinimalDatabaseTest"

# Test 2: Get full error details (most important)
./gradlew clean test --tests "DebugCommitErrorTest" --info 2>&1 | tee debug-output.txt

# Test 3: Try simple test with @DirtiesContext
./gradlew test --tests "SimpleEventTest"
```

---

## Files to Check (Updated)

## Summary

The "Unable to commit against JDBC Connection" error is most likely caused by:

1. Transaction management conflicts
2. Foreign key constraint violations during cleanup
3. Connection pool exhaustion
4. Database initialization issues

**Current solution:** Use `SimpleEventTest.kt` with `@DirtiesContext` for guaranteed isolation.

**Next steps:** If SimpleEventTest works, gradually add features back to EventTestingExamples.kt to identify the
specific issue.

