### 📚 Complete Testing Guide - Spring Boot + Testcontainers + Events

> **The ONLY guide you need for testing with Spring Boot, Testcontainers, PostgreSQL, and Event-Driven Architecture**

**Last Updated:** January 1, 2026

### TL;DR - Get Started in 3 Steps

```bash
### 1. Start Docker
open -a Docker  # macOS

### 2. Run tests
./gradlew test

### 3. View test report
./view-test-report.sh
### or manually: open build/reports/tests/test/index.html
```

**That's it!** PostgreSQL container starts automatically, schema applied, events truncated, tests run.

---

### What You Have

### Your Complete Test Stack ✅

- ✅ **Spring Boot 3.2** with Kotlin
- ✅ **Testcontainers** with PostgreSQL 15
- ✅ **Real database** (no mocking!)
- ✅ **Schema from schema.sql** (PostgreSQL-compatible)
- ✅ **Automatic event cleanup** with `@BeforeEach`
- ✅ **Test queue** for fast event testing
- ✅ **Database events** for persistence testing
- ✅ **Container reuse** for speed
- ✅ **Table truncation** between contexts

### What's New (January 2026) 🎉

1. **BaseIntegrationTest** - Automatic event cleanup
2. **Schema persistence** - Tables created once, data truncated
3. **Test queue support** - Fast event testing without DB overhead
4. **Comprehensive docs** - Everything in one place

---

### Testing Infrastructure

### Testcontainers Setup

### Configuration Class

Location: `src/test/kotlin/com/scriptmanager/config/TestcontainersConfiguration.kt`

```kotlin
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

    companion object {
        private val container: PostgreSQLContainer<*> =
            PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))
                .withDatabaseName("testdb")
                .withUsername("test")
                .withPassword("test")
                .withStartupTimeout(Duration.ofMinutes(2))
                .apply { start() }
    }

    @Bean
    @ServiceConnection
    fun postgresContainer(): PostgreSQLContainer<*> {
        // Check if schema exists
        if (schemaExists(container)) {
            println("✅ Schema already exists - skipping migration")
            println("🧹 Truncating all tables to clear test data...")
            truncateAllTables(container)
        } else {
            println("📄 Applying schema from schema.sql...")
            applySchemaFromFile(container)
        }
        return container
    }
}
```

### Key Features

1. **Singleton Container** - Started once, reused across tests
2. **Schema Application** - From `src/test/resources/schema.sql`
3. **Table Truncation** - Data cleared, schema preserved
4. **Connection Info** - Printed for GUI tools (DataGrip, etc.)

### What Happens on Startup

```
🔧 PostgreSQL Test Container Configuration
📦 Container: postgres:15-alpine
🗄️  Database: testdb (port: 52106)
👤 Username: test
🔑 Password: test
📍 JDBC URL: jdbc:postgresql://localhost:52106/testdb

✅ Schema already exists - skipping migration (container reuse)
🧹 Truncating all tables to clear test data...
   ✓ Truncated 18 table(s)
   ✓ Verified 18 table(s) created
```

---

### Base Integration Test Class

### Purpose

Automatically truncates the `event` table before each test to ensure clean state.

### Usage

Location: `src/test/kotlin/com/scriptmanager/integration/BaseIntegrationTest.kt`

```kotlin
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
abstract class BaseIntegrationTest {

    @Autowired
    protected lateinit var eventRepository: EventRepository

    @BeforeEach
    fun truncateEventsBeforeEachTest() {
        println("🧹 [BaseIntegrationTest] Truncating events table...")
        eventRepository.deleteAll()
        println("   ✓ Events table cleared")
    }
}
```

### How to Use

```kotlin
@SpringBootTest
class MyTest(
    private val commandInvoker: CommandInvoker
) : BaseIntegrationTest() {  // ← Extend this

    @Test
    fun `my test`() {
        // Event table is automatically empty!
        commandInvoker.invoke(CreateWorkspaceCommand("Test"))

        val events = eventRepository.findAll()
        assertEquals(1, events.size)  // Only our event
    }
}
```

### Benefits

- ✅ **No @DirtiesContext** needed (much faster!)
- ✅ **Clean event state** for every test
- ✅ **Schema persists** (no recreation overhead)
- ✅ **Other tables untouched** (can have fixtures)

---

### Schema Management

### Schema File

Location: `src/test/resources/schema.sql`

**Key Changes from SQLite**:

- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `REAL` → `REAL` (PostgreSQL double precision)
- SQLite date functions → PostgreSQL equivalents

**Example Conversion**:

```sql
-- Before (SQLite)
CREATE TABLE "event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" REAL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000.0 AS REAL))
);

-- After (PostgreSQL)
CREATE TABLE "event" (
    "id" SERIAL PRIMARY KEY,
    "created_at" REAL DEFAULT ROUND(extract(epoch from NOW()::TIMESTAMPTZ) * 1000, 0)::float
);
```

### Schema Application Strategy

1. **First Run**: Schema applied from file
2. **Subsequent Runs**: Schema exists, tables truncated
3. **Clean Slate**: All tables emptied, sequences reset

### Table Order

Tables must be created in dependency order:

1. Independent tables (no foreign keys)
2. Tables with foreign keys to #1
3. Tables with foreign keys to #2
4. etc.

Example:

```sql
-- First: Independent tables
CREATE TABLE "shell_script" (...);
CREATE TABLE "scripts_folder" (...);

-- Then: Tables that reference them
CREATE TABLE "rel_scriptsfolder_shellscript" (
    ...
    FOREIGN KEY ("shell_script_id") REFERENCES "shell_script" ("id"),
    FOREIGN KEY ("scripts_folder_id") REFERENCES "scripts_folder" ("id")
);
```

---

### Event Truncation

### Two Levels of Cleanup

#### 1. Context Level (TestcontainersConfiguration)

**When**: Spring context is created
**What**: All tables truncated
**How**: `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`

```kotlin
private fun truncateAllTables(container: PostgreSQLContainer<*>) {
    val tables = getAllTableNames()
    statement.execute("TRUNCATE TABLE ${tables.joinToString(", ")} RESTART IDENTITY CASCADE")
}
```

#### 2. Test Level (BaseIntegrationTest)

**When**: Before each test method
**What**: Only `event` table cleared
**How**: `eventRepository.deleteAll()`

```kotlin
@BeforeEach
fun truncateEventsBeforeEachTest() {
    eventRepository.deleteAll()
}
```

### Why Two Levels?

| Level   | Frequency        | Scope       | Use Case                   |
| ------- | ---------------- | ----------- | -------------------------- |
| Context | Once per context | All tables  | Fresh start for test class |
| Test    | Before each test | Events only | Isolate event assertions   |

### Result

- ✅ Fast tests (no context reload)
- ✅ Clean event state (no leftovers)
- ✅ Fixtures persist (workspace, folders, etc.)
- ✅ Predictable IDs (sequences reset)

---

### Testing Strategies

### Test Queue vs Database Events

### The Key Question

**"Should I use test queue or database events?"**

**Answer**: It depends on what you're testing!

### Quick Comparison

| Aspect             | Test Queue     | Database Events   |
| ------------------ | -------------- | ----------------- |
| **Speed**          | ⚡⚡⚡ Fast    | 🐢 Slower         |
| **Use For**        | Business logic | Event persistence |
| **Repositories**   | ✅ Real        | ✅ Real           |
| **Event Dispatch** | ✅ Real        | ✅ Real           |
| **Event Logging**  | ❌ Skipped     | ✅ Saved to DB    |
| **Test Volume**    | 90%            | 10%               |

### Test Queue Approach (90% of tests)

**When**: Testing command handlers and business logic

```kotlin
@Test
fun `test with queue - fast business logic test`() {
    val testQueue = SmartEventQueue()

    // ⚡ Fast - no event table I/O
    val workspace = commandInvoker.invoke(
        CreateWorkspaceCommand("Test"),
        testQueue  // ← Pass queue
    )

    // ✅ Real repository (workspace saved to DB)
    assertNotNull(workspace.id)

    // ✅ Real event dispatching
    val event = testQueue.allEvents.first().event as WorkspaceCreatedEvent
    assertEquals(workspace.id, event.workspace.id)

    // ⚡ No event table queries needed!
}
```

**What Happens**:

- ✅ Workspace saved → Real PostgreSQL
- ✅ Event emitted → Real event dispatching
- ✅ @EventListener → Real policy execution
- ⚡ Event logged → **SKIPPED** (for speed)

### Database Events Approach (10% of tests)

**When**: Testing event persistence and audit trail

```kotlin
@Test
fun `test with database - complete persistence test`() {
    // 🐢 Slower - includes event table I/O
    val workspace = commandInvoker.invoke(
        CreateWorkspaceCommand("Test")
        // No queue parameter
    )

    // Query from database
    val events = eventRepository.findAll()
    assertEquals(1, events.size)

    // ✅ Test persistence
    assertEquals("WorkspaceCreatedEvent", events[0].eventType)
    assertNotNull(events[0].createdAt)
    assertNotNull(events[0].requestId)

    // ✅ Test event content
    val event = objectMapper.readValue<WorkspaceCreatedEvent>(events[0].event)
    assertEquals(workspace.id, event.workspace.id)
}
```

**What Happens**:

- ✅ Workspace saved → Real PostgreSQL
- ✅ Event emitted → Real event dispatching
- ✅ @EventListener → Real policy execution
- ✅ Event logged → Real event repository

---

### When to Use What

### Decision Tree

```
What are you testing?
├─ Command business logic? → Use TEST QUEUE ⚡
├─ Event has correct data? → Use TEST QUEUE ⚡
├─ Validation rules? → Use TEST QUEUE ⚡
├─ Event saved to DB? → Use DATABASE EVENTS 🐢
├─ Audit trail query? → Use DATABASE EVENTS 🐢
└─ End-to-end flow? → Use DATABASE EVENTS 🐢
```

### Use Test Queue When

✅ Testing command handler logic
✅ Verifying event emission
✅ Checking event content/data
✅ Testing business rules
✅ Fast feedback during development
✅ Unit/integration tests

### Use Database Events When

✅ Testing event persistence
✅ Verifying audit trail
✅ Testing event queries
✅ End-to-end testing
✅ Transaction rollback tests
✅ Compliance/regulatory requirements

### Real-World Distribution

```
📊 Typical Test Suite (200 tests):

Test Queue:     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  180 tests (90%)
Database Events: ▓░░                    20 tests (10%)

Total time: ~18 seconds
```

---

### Code Examples

### Example 1: Fast Business Logic Test

```kotlin
@SpringBootTest
class WorkspaceCommandTest(
    private val commandInvoker: CommandInvoker
) : BaseIntegrationTest() {

    @Test
    fun `should create workspace and emit event`() {
        // Arrange
        val testQueue = SmartEventQueue()

        // Act
        val workspace = commandInvoker.invoke(
            CreateWorkspaceCommand("My Workspace"),
            testQueue
        )

        // Assert - Business logic
        assertNotNull(workspace.id)
        assertEquals("My Workspace", workspace.name)

        // Assert - Event emission
        assertEquals(1, testQueue.allEvents.size)
        val event = testQueue.allEvents.first().event as WorkspaceCreatedEvent
        assertEquals(workspace.id, event.workspace.id)
        assertEquals("My Workspace", event.workspace.name)
    }
}
```

### Example 2: Complete Persistence Test

```kotlin
@SpringBootTest
class WorkspaceEventPersistenceTest(
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseIntegrationTest() {

    @Test
    fun `should persist event to database with metadata`() {
        // Act
        val workspace = commandInvoker.invoke(
            CreateWorkspaceCommand("Test Workspace")
        )

        // Assert - Database persistence
        val events = eventRepository.findAll()
        assertEquals(1, events.size)

        val dbEvent = events.first()
        assertEquals("WorkspaceCreatedEvent", dbEvent.eventType)
        assertNotNull(dbEvent.createdAt)
        assertNotNull(dbEvent.requestId)
        assertEquals(true, dbEvent.success)

        // Assert - Event content
        val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(dbEvent.event)
        assertEquals(workspace.id, eventData.workspace.id)
        assertEquals("Test Workspace", eventData.workspace.name)
    }
}
```

### Example 3: Testing Multiple Events

```kotlin
@Test
fun `should capture multiple events in order`() {
    val testQueue = SmartEventQueue()

    // Create multiple entities
    val workspace1 = commandInvoker.invoke(CreateWorkspaceCommand("WS1"), testQueue)
    val workspace2 = commandInvoker.invoke(CreateWorkspaceCommand("WS2"), testQueue)

    // Assert event order
    assertEquals(2, testQueue.allEvents.size)

    val event1 = testQueue.allEvents[0].event as WorkspaceCreatedEvent
    val event2 = testQueue.allEvents[1].event as WorkspaceCreatedEvent

    assertEquals("WS1", event1.workspace.name)
    assertEquals("WS2", event2.workspace.name)
}
```

### Example 4: Testing Event Queries

```kotlin
@Test
fun `should query events by type`() {
    // Create multiple workspaces
    commandInvoker.invoke(CreateWorkspaceCommand("WS1"))
    commandInvoker.invoke(CreateWorkspaceCommand("WS2"))
    commandInvoker.invoke(CreateWorkspaceCommand("WS3"))

    // Query events
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }

    assertEquals(3, events.size)

    // All events have metadata
    events.forEach { event ->
        assertNotNull(event.requestId)
        assertNotNull(event.createdAt)
        assertEquals(true, event.success)
    }
}
```

---

### Best Practices

### Jackson vs Gson

### Use Jackson (ObjectMapper) ✅

Your project uses Jackson, and you should continue using it.

**Why Jackson?**

1. **Spring Boot Default** - Already integrated
2. **Kotlin Support** - Excellent via `jackson-module-kotlin`
3. **Performance** - Faster than Gson
4. **Features** - More annotations, streaming, polymorphism
5. **GraalVM** - Better native image support
6. **Consistency** - One JSON library everywhere

**Your Usage (Perfect!):**

```kotlin
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

// ✅ Type-safe, Kotlin-friendly
val event = objectMapper.readValue<WorkspaceCreatedEvent>(json)
```

**Don't Use Gson Unless**:

- ❌ Integrating with legacy Gson-only library
- ❌ Using Google Cloud libraries that require it

**Why Not Gson?**

| Feature            | Jackson    | Gson        |
| ------------------ | ---------- | ----------- |
| Spring Integration | ✅ Native  | ❌ Manual   |
| Kotlin Nullability | ✅ Perfect | ⚠️ Basic    |
| Performance        | ⚡⚡⚡     | ⚡⚡        |
| Native Image       | ✅ Great   | ⚠️ Limited  |
| Your Codebase      | ✅ Used    | ❌ Not used |

**Verdict**: Stick with Jackson! 🎉

---

### IDE Performance (Build Directory)

### The Problem

IntelliJ IDEA tries to index the `build/` directory after each test run, causing the IDE to freeze.

### The Solution

**Mark `build` as Excluded:**

1. Right-click `build` folder in Project view
2. Select **"Mark Directory as"** → **"Excluded"**
3. Folder turns orange/red and won't be indexed

**Or via Project Structure:**

1. **File** → **Project Structure** (⌘;)
2. Select **"Modules"**
3. Find `backend-spring` module
4. In **"Sources"** tab, locate `build` folder
5. Click **"Excluded"** button
6. Click **"Apply"** and **"OK"**

### What Gets Excluded

When you exclude `build`:

- ✅ No indexing of generated files
- ✅ Faster IDE performance
- ✅ No autocomplete from generated code
- ✅ Test reports still accessible

### Accessing Test Reports

Even with `build` excluded:

```bash
### Open in browser
./view-test-report.sh
### or
open build/reports/tests/test/index.html

### Run tests and view report
./test-and-view.sh
```

### Other Directories to Exclude

If still having issues:

- `.gradle/` - Gradle cache
- `.kotlin/` - Kotlin compiler cache
- `bin/` - Additional build output
- `out/` - IntelliJ output

---

### Test Reports

### Location

```
build/reports/tests/test/index.html
```

### Viewing Reports

**Option 1: Helper Script**

```bash
./view-test-report.sh
```

**Option 2: Run and View**

```bash
./test-and-view.sh
```

**Option 3: Manual**

```bash
open build/reports/tests/test/index.html
```

### What's in the Report

- ✅ Test results (pass/fail)
- ✅ Execution time per test
- ✅ Test output and logs
- ✅ Failure stack traces
- ✅ Summary statistics
- ✅ Package breakdown

### Example Report Output

```
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests:      45
Passed:     43
Failed:     2
Duration:   12.5s

Packages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
com.scriptmanager.integration    38 tests (95% pass)
com.scriptmanager.unit           7 tests (100% pass)
```

---

### Reference

### File Structure

### Configuration Files

```
backend-spring/
├── src/
│   ├── test/
│   │   ├── kotlin/com/scriptmanager/
│   │   │   ├── config/
│   │   │   │   └── TestcontainersConfiguration.kt  ← Container setup
│   │   │   └── integration/
│   │   │       ├── BaseIntegrationTest.kt          ← Event cleanup
│   │   │       ├── SimpleEventTest.kt               ← DB events example
│   │   │       └── EventTestingWithQueueExamples.kt ← Queue examples
│   │   └── resources/
│   │       ├── schema.sql                           ← PostgreSQL schema
│   │       ├── application-test.yml                 ← Test config
│   │       └── junit-platform.properties            ← JUnit config
```

### Documentation Files

```
backend-spring/
├── TESTING_AND_CONTAINERS_COMPLETE.md  ← This file (MAIN)
├── view-test-report.sh                  ← Helper: View reports
└── test-and-view.sh                     ← Helper: Test + view
```

### Files to Delete (Consolidated)

These files are now consolidated into this document:

- ❌ `EVENT_TESTING_QUICK_START.md`
- ❌ `EVENT_TESTING_GUIDE.md`
- ❌ `TESTING_STRATEGY.md`
- ❌ `TESTING_QUICK_REFERENCE.md`
- ❌ `JACKSON_VS_GSON.md`
- ❌ `EXCLUDE_BUILD_FROM_INDEXING.md`
- ❌ `CHANGES_EVENT_TESTING.md`
- ❌ `FIX_ROLLBACK_ERROR.md`
- ❌ `TROUBLESHOOTING_JDBC_COMMIT.md`
- ❌ `URGENT_FIX_STEPS.md`

---

### Helper Scripts

### view-test-report.sh

```bash
#!/bin/bash
### Opens the latest test report in browser

REPORT_PATH="build/reports/tests/test/index.html"

if [ -f "$REPORT_PATH" ]; then
    echo "🔍 Opening test report in browser..."
    open "$REPORT_PATH"
else
    echo "❌ No test report found at: $REPORT_PATH"
    echo "💡 Run tests first: ./gradlew test"
    exit 1
fi
```

Usage: `./view-test-report.sh`

### test-and-view.sh

```bash
#!/bin/bash
### Runs tests and opens report

echo "🧪 Running tests..."
./gradlew test

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Tests passed!"
else
    echo "⚠️  Some tests failed (exit code: $EXIT_CODE)"
fi

echo ""
echo "📊 Opening test report..."
open build/reports/tests/test/index.html

exit $EXIT_CODE
```

Usage: `./test-and-view.sh`

---

### Troubleshooting

### Container Won't Start

**Problem**: PostgreSQL container fails to start

**Solutions**:

```bash
### 1. Check Docker is running
docker ps

### 2. Start Docker
open -a Docker

### 3. Clean up old containers
docker ps -a | grep postgres
docker rm -f <container-id>

### 4. Check port conflicts
lsof -i :5432
```

### Schema Not Applied

**Problem**: Tables don't exist in database

**Solutions**:

1. Check `schema.sql` exists in `src/test/resources/`
2. Verify PostgreSQL syntax (not SQLite)
3. Check logs for SQL errors
4. Manually connect and verify: `psql -h localhost -p <port> -U test -d testdb`

### Tests Fail with "Relation Does Not Exist"

**Problem**: Table not found error

**Causes**:

1. Schema not applied
2. Table creation order wrong (foreign keys before referenced tables)
3. Schema file has syntax errors

**Solutions**:

```bash
### 1. Check schema application logs
./gradlew test --info | grep -A 10 "Applying schema"

### 2. Manually inspect schema.sql
cat src/test/resources/schema.sql

### 3. Test SQL syntax in PostgreSQL
psql -h localhost -p <port> -U test -d testdb < src/test/resources/schema.sql
```

### Events Not Cleaned Between Tests

**Problem**: Tests see events from previous tests

**Solution**:

```kotlin
// Make sure your test extends BaseIntegrationTest
@SpringBootTest
class MyTest : BaseIntegrationTest() {  // ← Must extend this
    @Test
    fun `my test`() {
        // Events automatically cleaned before this runs
    }
}
```

### IDE Freezes During Tests

**Problem**: IntelliJ IDEA freezes when running tests

**Solution**: Exclude `build` directory from indexing (see [IDE Performance](#ide-performance-build-directory))

### Slow Tests

**Problem**: Tests take too long

**Solutions**:

1. Use test queue instead of database events (90% of tests)
2. Check container reuse is enabled
3. Reduce logging verbosity
4. Run tests in parallel

```kotlin
// build.gradle.kts
tasks.test {
    maxParallelForks = Runtime.getRuntime().availableProcessors() / 2
}
```

### Port Already in Use

**Problem**: Port conflict error

**Solution**:

```bash
### Testcontainers uses dynamic ports automatically
### If still failing, check for zombie containers:
docker ps -a | grep postgres
docker rm -f <container-id>
```

---

### FAQ

### Q: Do I need to start/stop containers manually?

**A:** No! Testcontainers handles this automatically.

### Q: Can I inspect the database during tests?

**A:** Yes! Use the connection info printed at startup:

```
📍 JDBC URL: jdbc:postgresql://localhost:52106/testdb
👤 Username: test
🔑 Password: test
```

Connect with DataGrip, DBeaver, or psql.

### Q: Are tables dropped after each test?

**A:** No. Schema persists, data is truncated. This is much faster.

### Q: What about transaction rollback?

**A:** Not needed. Event table is cleared before each test via `@BeforeEach`. Other tables are truncated between
contexts.

### Q: Can I use @DirtiesContext?

**A:** You can, but you shouldn't need to. BaseIntegrationTest handles cleanup more efficiently.

### Q: Why PostgreSQL for tests but SQLite in production?

**A:** Testing against production database type catches more bugs. SQLite is fine for local dev/demo.

### Q: How do I test transaction rollback?

**A:** Use database events approach (no test queue) and force a rollback:

```kotlin
@Test
fun `should rollback on error`() {
    assertThrows<RuntimeException> {
        commandInvoker.invoke(CommandThatFails())
    }

    // Verify nothing was saved
    assertEquals(0, eventRepository.findAll().size)
}
```

### Q: Can I run tests without Docker?

**A:** No. Testcontainers requires Docker. Consider H2 database if Docker isn't available, but you'll lose
PostgreSQL-specific testing.

### Q: How do I debug failing tests?

**A:**

1. Check test report: `./view-test-report.sh`
2. Run with `--info`: `./gradlew test --info`
3. Connect to DB during test with debugger breakpoint
4. Check logs in `build/test-results/test/`

---

### Summary

### What You've Achieved ✅

1. ✅ **Real database testing** with PostgreSQL
2. ✅ **Fast tests** with container reuse and schema persistence
3. ✅ **Clean state** with automatic event truncation
4. ✅ **Flexible testing** with queue and database approaches
5. ✅ **Best practices** with Jackson, BaseIntegrationTest, and more
6. ✅ **Great DX** with helper scripts and clear documentation

### Test Writing Checklist

```
✅ Extend BaseIntegrationTest
✅ Use test queue for business logic (90%)
✅ Use database events for persistence (10%)
✅ Run ./test-and-view.sh to see results
✅ Exclude build/ directory in IDE
✅ Stick with Jackson for JSON
```

### Next Steps

1. Write more tests using examples from this guide
2. Refactor existing tests to use BaseIntegrationTest
3. Measure test performance improvements
4. Share this guide with your team

---

**🎉 Happy Testing!**

Your testing infrastructure is now complete, fast, and maintainable. Focus on writing great tests, not fighting with
configuration!

---

**Version**: 2.0 (January 2026)  
**Author**: Consolidated from multiple guides  
**Feedback**: Open an issue or PR
