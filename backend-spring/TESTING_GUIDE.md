# Complete Testing Guide for Script Manager Backend

**Last Updated**: January 3, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Resource-Based vs Domain-Based Testing](#resource-based-vs-domain-based-testing)
3. [Test Organization Structure](#test-organization-structure)
    - **[Why Separate Creation from Management?](#why-separate-creation-from-management)** ⭐
4. [Testing Infrastructure](#testing-infrastructure)
5. [What to Test](#what-to-test)
6. [Running Tests](#running-tests)
7. [Test Examples](#test-examples)
8. [Best Practices](#best-practices)
9. [Visual Guide](#visual-guide)
10. [Coverage Status](#coverage-status)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This document provides a comprehensive guide to testing the Script Manager backend, which uses:

- **Spring Boot + Kotlin**
- **Event-Driven Architecture** (Command/Event pattern)
- **PostgreSQL** (via Testcontainers in tests)
- **Multiple Domains**: scriptmanager and ai
- **REST API**: Multiple endpoints across different resources

### Key Decision: Resource-Based Testing ✅

**Tests are organized by REST API endpoints (resources), NOT by internal domain structure.**

**Why?**

- Your app has multiple domains (scriptmanager, ai) but they're **internal implementation**
- Users interact via **REST API** (/workspace, /ai/ai-profile) - this is the **external contract**
- Tests verify the **API works correctly**, regardless of which domain handles it
- Resource-based structure **mirrors API documentation** - easier to navigate
- **Frontend-friendly** - Frontend calls `/ai/ai-profile`, test is in `ai/AiProfileTest`

---

## 🗂️ Resource-Based vs Domain-Based Testing

### Your Application Structure

#### Domains (Internal)

```
com.scriptmanager.domain/
├── scriptmanager/          # Script management domain
│   ├── command/            # 20+ commands (CreateWorkspace, CreateScript, etc.)
│   ├── commandhandler/
│   ├── event/
│   └── query/
└── ai/                     # AI domain
    ├── command/            # AI-specific commands (CreateAiProfile, etc.)
    ├── commandhandler/
    └── event/
```

#### REST API Controllers (External Interface)

```
com.scriptmanager.controller/
├── WorkspaceController.kt  # /workspace endpoints
├── FolderController.kt     # /folder endpoints
├── ScriptController.kt     # /script endpoints
├── AIController.kt         # /ai endpoints
└── AppStateController.kt   # /appstate endpoints
```

### ✅ Correct: Resource-Based Test Organization

Tests mirror your **REST API structure**, not internal domain structure:

```
src/test/kotlin/com/scriptmanager/integration/
├── BaseTest.kt                    # Shared base (event cleanup)
├── TestSuite.kt                   # Master suite (all domains)
│
├── workspace/                     # Tests for /workspace API
│   ├── WorkspaceCreationTest.kt   # POST /workspace
│   ├── WorkspaceManagementTest.kt # PUT/DELETE /workspace/{id}
│   └── WorkspaceFolderTest.kt     # Workspace-folder relationships
│
├── folder/                        # Tests for /folder API
│   ├── FolderCreationTest.kt      # POST /folder
│   ├── FolderManagementTest.kt    # PUT/DELETE /folder/{id}
│   └── FolderHierarchyTest.kt     # Parent-child relationships
│
├── script/                        # Tests for /script API
│   ├── ScriptCreationTest.kt      # POST /script
│   ├── ScriptManagementTest.kt    # PUT/DELETE /script/{id}
│   ├── ScriptHistoryTest.kt       # POST /script/{id}/history
│   └── MarkdownTest.kt            # POST /script/markdown
│
├── ai/                            # Tests for /ai API (AI DOMAIN)
│   ├── AiProfileTest.kt           # POST /ai/ai-profile
│   └── ModelConfigTest.kt         # POST /ai/model-config
│
└── appstate/                      # Tests for /appstate API
    └── AppStateTest.kt            # PUT /appstate
```

**Benefits:**

- ✅ Tests match API documentation - Easy to find tests for specific endpoints
- ✅ Resource-focused - Tests grouped by what users interact with
- ✅ Multi-domain support - Both scriptmanager and ai domains covered
- ✅ API contract testing - Ensures external interface works correctly
- ✅ Frontend-aligned - Frontend calls `/ai/ai-profile`, test is in `ai/AiProfileTest`

### ❌ Incorrect: Domain-Based Organization

```
src/test/kotlin/com/scriptmanager/integration/
├── scriptmanager/         # ❌ Only one domain
│   ├── WorkspaceTest.kt
│   ├── FolderTest.kt
│   └── ScriptTest.kt
└── ai/                    # ❌ Separate from API structure
    └── AiTest.kt
```

**Problems:**

- Doesn't match REST API structure
- Harder to find tests for specific endpoints
- Couples tests to internal domain structure (bad for refactoring)

---

## 📂 Test Organization Structure

### Current Implementation

```
src/test/kotlin/com/scriptmanager/integration/
├── BaseTest.kt                    # ✅ Event cleanup infrastructure
├── TestSuite.kt                   # ✅ Master suite (all domains)
├── config/
│   └── TestcontainersConfiguration.kt  # ✅ PostgreSQL setup
│
├── workspace/                     # ✅ Tests for /workspace API
│   └── WorkspaceLifecycleTest.kt  # POST/PUT/DELETE (COMBINED - all operations) ✅
│
├── folder/                        # ✅ Tests for /folder API
│   └── FolderCreationTest.kt      # POST /folder (only creation implemented)
│
├── script/                        # ✅ Tests for /script API
│   └── ScriptLifecycleTest.kt     # POST/PUT/DELETE (COMBINED - all operations) ✅
│
└── ai/                            # ✅ Tests for /ai API (AI DOMAIN)
    ├── AiProfileTest.kt           # POST /ai/ai-profile (creation + validation)
    └── ModelConfigTest.kt         # POST /ai/model-config (creation + validation)
```

**Note**: Tests now use the **COMBINED approach consistently**:

- ✅ Workspace tests are **COMBINED** in `WorkspaceLifecycleTest`
- ✅ Script tests are **COMBINED** in `ScriptLifecycleTest`
- 🎯 **Consistent pattern** across all resources

This follows **Option 2: Combine Lifecycle** pattern for simplicity and consistency.

### Why Separate Creation from Management?

**Your Question**: "Why not `ScriptManagementTest` and `ScriptCreationTest` the same class? Both are management."

**Answer**: Great catch! The tests were previously inconsistent. Now they're **COMBINED** for consistency!

**Current Reality**:

- ✅ **Workspace**: Combined into `WorkspaceLifecycleTest` (both creation AND management)
- ✅ **Script**: Combined into `ScriptLifecycleTest` (both creation AND management)
- 🎯 **CONSISTENT!** Both use the combined approach

**Why combined?**

- **Fewer files** → Simpler project structure
- **Tests workflows** → Shows full lifecycle (create → update → delete)
- **Consistent** → All resources follow same pattern

The project now follows **Option 2: Combine Lifecycle** for consistency.

The project now follows **Option 2: Combine Lifecycle** for consistency.

**✅ Implementation Complete!** All workspace tests have been combined into `WorkspaceLifecycleTest`.

---

### Original Explanation: When to Separate vs Combine

**Question**: Why have `WorkspaceCreationTest` AND `WorkspaceManagementTest` separately?

**Answer**: Single Responsibility Principle - Each test class has one clear focus.

#### WorkspaceCreationTest (Creation Only)

```kotlin
// Focus: POST /workspace
@Test
fun `should create workspace with valid name`()

@Test
fun `should create workspace with special characters`()

@Test
fun `should handle empty name`()

@Test
fun `should create multiple workspaces independently`()
```

**Characteristics:**

- ✅ **Simple Setup** - No pre-existing data needed
- ✅ **Single Operation** - Only tests creation
- ✅ **Fast** - Minimal dependencies
- ✅ **Clear Intent** - "Creation broken? Check this file"

#### WorkspaceManagementTest (Lifecycle Operations)

```kotlin
// Focus: PUT /workspace/{id}, DELETE /workspace/{id}, PUT /workspace/reorder
@Test
fun `should update workspace name`()

@Test
fun `should delete workspace`()

@Test
fun `should reorder workspaces`()

@Test
fun `should handle update on non-existent workspace`()
```

**Characteristics:**

- ✅ **Complex Setup** - Must create workspace first, then modify
- ✅ **Multiple Operations** - Update, delete, reorder
- ✅ **State Transitions** - Tests changing existing data
- ✅ **Relationships** - What happens when deleting workspace with folders?

#### Benefits of Separation

| Benefit                   | Description                                        |
|---------------------------|----------------------------------------------------|
| **Clear Intent**          | File name immediately tells you what's tested      |
| **Easier Debugging**      | "Creation failing? → WorkspaceCreationTest"        |
| **Focused Failures**      | If WorkspaceCreationTest fails, creation is broken |
| **Different Complexity**  | Creation = simple; Management = state changes      |
| **Single Responsibility** | Each class has one job                             |

#### Alternative: Combined Approach with @Nested

You can also combine them into one file:

```kotlin
@SpringBootTest
class WorkspaceTest : BaseTest(eventRepository) {

    @Nested
    inner class Creation {
        @Test
        fun `should create workspace`() {
            ...
        }

        @Test
        fun `should handle invalid name`() {
            ...
        }
    }

    @Nested
    inner class Management {
        @Test
        fun `should update workspace`() {
            ...
        }

        @Test
        fun `should delete workspace`() {
            ...
        }
    }
}
```

**Both approaches are valid!** Choose based on:

- **Separate files** → Better for large codebases, clearer navigation
- **@Nested classes** → Better for smaller test suites, keeps related tests together

**This guide uses separate files because:**

- ✅ More explicit file names (easier to find in IDE)
- ✅ Each file has clear, single focus
- ✅ Scales better as test suite grows

### Test Separation Pattern

#### Current Implementation (Mixed Approach) ⚠️

```
workspace/
├── WorkspaceCreationTest.kt      ← POST /workspace (SEPARATED)
└── WorkspaceManagementTest.kt    ← PUT/DELETE (SEPARATED)

folder/
└── FolderCreationTest.kt         ← POST /folder (only creation implemented)

script/
└── ScriptLifecycleTest.kt        ← POST/PUT/DELETE (COMBINED - all operations)

ai/
├── AiProfileTest.kt              ← POST /ai/ai-profile (creation + validation)
└── ModelConfigTest.kt            ← POST /ai/model-config (creation + validation)
```

**Notice**: There's an **inconsistency** - workspace tests are separated, but script tests are combined!

#### When to SEPARATE vs COMBINE?

**Question**: Should we separate `ScriptCreationTest` and `ScriptManagementTest` like workspace, or combine them like
the current `ScriptLifecycleTest`?

**Answer**: Both approaches work - choose based on these factors:

##### ✅ SEPARATE When:

- **Many operations** (3+ creation tests, 3+ management tests)
- **Different complexity** (creation is simple, management is complex)
- **Large test suite** (10+ tests total - file becomes too large)
- **Different test data patterns** (creation tests many validations, management tests workflows)

**Example**: Workspace

- Creation: 5 tests (valid name, special chars, duplicates, etc.)
- Management: 6 tests (update, delete, reorder, cascade, error handling)
- Total: 11 tests → **Better to separate**

##### ✅ COMBINE When:

- **Few operations** (< 10 tests total for all CRUD)
- **Testing workflows** (create → update → delete as one flow)
- **Similar setup** (all tests use same fixtures)
- **Simple operations** (no complex state transitions)

**Example**: Script (current)

- Lifecycle: 4 tests (create → update → delete → full workflow)
- Total: 4 tests → **OK to combine**

#### Recommended: Choose ONE Approach for Consistency

**Option 1: Separate Everything** (Best for large projects)

```
workspace/
├── WorkspaceCreationTest.kt
└── WorkspaceManagementTest.kt

script/
├── ScriptCreationTest.kt         ← Split ScriptLifecycleTest
└── ScriptManagementTest.kt       ← Into two files

folder/
├── FolderCreationTest.kt
└── FolderManagementTest.kt
```

**Benefits**:

- ✅ **Consistent** across all resources
- ✅ **Clear intent** - file name tells you exactly what's tested
- ✅ **Easier debugging** - "Creation failing? Check *CreationTest"
- ✅ **Scales better** - can add tests without files getting too large

**Option 2: Combine Lifecycle** (Good for smaller projects)

```
workspace/
└── WorkspaceLifecycleTest.kt     ← Combine Creation + Management

script/
└── ScriptLifecycleTest.kt        ← Already combined

folder/
└── FolderLifecycleTest.kt        ← Combine Creation + Management
```

**Benefits**:

- ✅ **Fewer files**
- ✅ **Tests workflows** - shows full lifecycle in one place
- ✅ **Simpler structure**

**This guide recommends Option 1 (separate) for consistency and scalability.**

#### Ideal Pattern (If You Choose Option 1)

```
workspace/
├── WorkspaceCreationTest.kt      ← POST /workspace
└── WorkspaceManagementTest.kt    ← PUT/DELETE /workspace/{id}

folder/
├── FolderCreationTest.kt         ← POST /folder
├── FolderManagementTest.kt       ← PUT/DELETE /folder/{id}
└── FolderHierarchyTest.kt        ← POST /folder/{id}/subfolder (relationships)

script/
├── ScriptCreationTest.kt         ← POST /script
├── ScriptManagementTest.kt       ← PUT/DELETE /script/{id}
├── ScriptHistoryTest.kt          ← POST /script/{id}/history (special feature)
└── MarkdownTest.kt               ← POST /script/markdown (special type)

ai/
├── AiProfileTest.kt              ← POST /ai/ai-profile
└── ModelConfigTest.kt            ← POST /ai/model-config
```

**Naming Convention**:

- `*CreationTest` = Create operations (POST without ID)
- `*ManagementTest` = Update/Delete operations (PUT/DELETE with ID)
- `*SpecificFeatureTest` = Special features (History, Hierarchy, Markdown, etc.)

### Integration Tests (PRIMARY STRATEGY)

**Purpose**: Test complete workflows end-to-end with real database interactions

**What We Test:**

- ✅ Command execution produces correct results
- ✅ Events are emitted with accurate payloads
- ✅ Data persists correctly in PostgreSQL
- ✅ Business logic and validation rules
- ✅ Parent-child relationships and cascades

**Technology Stack:**

- `@SpringBootTest` - Full Spring context
- **Testcontainers** - Real PostgreSQL database
- `BaseTest` - Automatic event cleanup between tests
- **No mocking** - Real repositories, real database

---

## 🔧 Testing Infrastructure

### BaseTest Class

```kotlin
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
abstract class BaseTest(
    private val eventRepository: EventRepository
) {
    @BeforeEach
    fun truncateEventsBeforeEachTest() {
        eventRepository.deleteAll()  // Clean slate for each test
    }
}
```

**Key Features:**

- ✅ **Automatic event cleanup** - No test pollution
- ✅ **Fast** - Only truncates events table, not schema recreation
- ✅ **Persistent schema** - Tables stay, data is cleaned
- ✅ **No @DirtiesContext** - Much faster than recreating Spring context

### Testcontainers Configuration

```kotlin
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
    @Bean
    fun postgresContainer(): PostgreSQLContainer<*> {
        return PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("testdb")
            .apply {
                start()
                applySchemaFromFile()  // Run schema.sql once on startup
            }
    }
}
```

**Key Features:**

- ✅ Real PostgreSQL (not H2 or embedded DB)
- ✅ Schema applied once on container start
- ✅ Same database for all tests (fast, no recreation)
- ✅ Automatic cleanup via `@BeforeEach` in BaseTest

---

## 🧪 What to Test

### For Each API Endpoint / Command

#### ✅ Happy Path

- Command executes successfully
- Returns expected result
- Event is emitted with correct type
- Event payload matches expected data
- Data persists in database

#### ✅ Business Logic

- Validation rules (e.g., name requirements, length limits)
- State transitions (e.g., can't delete workspace with folders)
- Uniqueness constraints
- Default values

#### ✅ Edge Cases

- Empty inputs (if allowed)
- Very long inputs (boundary testing)
- Special characters in names/content
- Non-existent IDs (error handling)

#### ✅ Relationships

- Parent-child associations (workspace → folder → script)
- Cascade behaviors (what happens when parent is deleted?)
- Ordering/reordering operations
- Multiple levels of nesting (if supported)

#### ✅ Event Verification

- Event type is correct
- Event marked as `success = true`
- Event payload deserializes correctly
- Event contains all necessary data for consumers

### Test Coverage Guidelines

**Minimum Coverage per Command:**

1. **1 Happy Path Test** - Basic success scenario
2. **1 Event Verification Test** - Event emitted correctly
3. **1 Persistence Test** - Data saved to database
4. **1+ Edge Case Tests** - Error handling, boundaries

**Recommended Coverage per Resource:**

- **5-10 tests per API resource** (workspace, folder, script, ai)
- **Test workflows**, not just individual commands
- **Test relationships** between entities

### What NOT to Test

❌ **Don't test framework code**

- Spring Boot internals
- JPA/Hibernate behavior
- Jackson JSON serialization (unless custom)

❌ **Don't over-mock**

- Use real repositories (you're already doing this ✅)
- Use real database via Testcontainers
- Only mock external services (e.g., AWS S3, external APIs)

❌ **Don't need test queues**

- Your `eventRepository` is the source of truth
- Query events directly from database in tests
- No need for in-memory event queue for testing

---

## 🚀 Running Tests

### Run All Tests

```bash
./gradlew test
```

### Run Specific Test Class

```bash
./gradlew test --tests "WorkspaceCreationTest"
./gradlew test --tests "ScriptLifecycleTest"
./gradlew test --tests "AiProfileTest"
```

### Run Test Suite (All Integration Tests)

```bash
./gradlew test --tests "TestSuite"
```

### Run Tests by Package/Resource

```bash
# All workspace tests (scriptmanager domain)
./gradlew test --tests "com.scriptmanager.integration.workspace.*"

# All folder tests
./gradlew test --tests "com.scriptmanager.integration.folder.*"

# All script tests
./gradlew test --tests "com.scriptmanager.integration.script.*"

# All AI tests (ai domain)
./gradlew test --tests "com.scriptmanager.integration.ai.*"
```

### Run Tests with Detailed Output

```bash
./gradlew test --info
```

### View Test Reports

After running tests, open the HTML report:

```bash
open build/reports/tests/test/index.html
```

Or navigate to:

```
build/reports/tests/test/index.html
```

---

## 💡 Test Examples

### Example 1: ScriptManager Domain Test (Workspace API)

```kotlin
/**
 * Tests for Workspace Creation API
 * Maps to: POST /workspace
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class WorkspaceCreationTest(
    private val eventRepository: EventRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create workspace via POST workspace`() {
        // Arrange
        val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"

        // Act - Simulates POST /workspace
        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(workspaceName, result.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
        assertEquals(1, events.size)
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<WorkspaceCreatedEvent>(events.first().payload)
        assertEquals(workspaceName, payload.workspace.name)
    }
}
```

### Example 2: AI Domain Test (AI Profile API)

```kotlin
/**
 * Tests for AI Profile API
 * Maps to: POST /ai/ai-profile
 * Domain: com.scriptmanager.domain.ai
 */
@SpringBootTest
class AiProfileTest(
    private val eventRepository: EventRepository,
    private val commandInvoker: CommandInvoker
) : BaseTest(eventRepository) {

    @Test
    fun `should create AI profile via POST ai-profile`() {
        // Arrange
        val profileName = "GPT4Profile_${System.currentTimeMillis()}"

        // Act - Simulates POST /ai/ai-profile
        val result = commandInvoker.invoke(
            CreateAiProfileCommand(profileName, "AI assistant")
        )

        // Assert
        assertNotNull(result.id)

        // Verify event from ai domain
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileCreatedEvent" }
        assertEquals(1, events.size)
    }
}
```

### Example 3: Error Validation Test

```kotlin
@Test
fun `should throw error for invalid model source`() {
    // Arrange
    val aiProfile = commandInvoker.invoke(
        CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Test")
    )

    // Act & Assert - Should throw IllegalArgumentException
    val exception = assertThrows(IllegalArgumentException::class.java) {
        commandInvoker.invoke(
            CreateModelConfigCommand(
                name = "Config",
                modelSource = "INVALID_SOURCE", // Invalid!
                aiprofileId = aiProfile.id!!
            )
        )
    }

    // Assert - Error message is correct
    assertTrue(exception.message!!.contains("Model source must be one of: OPENAI, AZURE_OPENAI"))

    // Assert - No event was emitted for failed validation
    val events = eventRepository.findAll()
        .filter { it.eventType == "ModelConfigCreatedEvent" }
    assertEquals(0, events.size)
}
```

---

## 📝 Best Practices

### 1. Use Descriptive Test Names

```kotlin
// ✅ Good
@Test
fun `should emit WorkspaceCreatedEvent when creating workspace`()

// ❌ Bad
@Test
fun testCreate()
```

### 2. Follow AAA Pattern (Arrange-Act-Assert)

```kotlin
@Test
fun `test name`() {
    // Arrange - Setup test data
    val input = CreateWorkspaceCommand("Test")

    // Act - Execute the command
    val result = commandInvoker.invoke(input)

    // Assert - Verify results
    assertEquals("Test", result.name)
}
```

### 3. Use Unique Test Data

```kotlin
// ✅ Prevents conflicts between parallel tests
val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"
```

### 4. Verify Events in Every Test

```kotlin
// Always check events were emitted
val events = eventRepository.findAll()
    .filter { it.eventType == "WorkspaceCreatedEvent" }
assertEquals(1, events.size)
assertTrue(events.first().success)
```

### 5. Test Event Payloads

```kotlin
// Deserialize and verify event contents
val payload = objectMapper.readValue<WorkspaceCreatedEvent>(event.payload)
assertEquals(workspaceName, payload.workspace.name)
```

### 6. Test Error Cases

```kotlin
// Verify validation errors throw correct exceptions
val exception = assertThrows(IllegalArgumentException::class.java) {
    commandInvoker.invoke(InvalidCommand())
}
assertTrue(exception.message!!.contains("expected error message"))
```

### 7. Clean Up Additional Data When Needed

```kotlin
@BeforeEach
fun cleanUpWorkspaces() {
    workspaceRepository.deleteAll()  // If needed beyond event cleanup
}
```

---

## 🏗️ Test Suite Organization (JUnit 5)

### Define Test Order with @TestMethodOrder

```kotlin
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
class OrderedWorkflowTest : BaseTest(eventRepository) {

    @Test
    @Order(1)
    fun `step 1 - create workspace`() {
        ...
    }

    @Test
    @Order(2)
    fun `step 2 - add folder to workspace`() {
        ...
    }

    @Test
    @Order(3)
    fun `step 3 - add script to folder`() {
        ...
    }
}
```

### Group Tests with @Nested

```kotlin
@SpringBootTest
class WorkspaceTest : BaseTest(eventRepository) {

    @Nested
    inner class Creation {
        @Test
        fun `should create workspace`() {
            ...
        }
    }

    @Nested
    inner class Updates {
        @Test
        fun `should update workspace name`() {
            ...
        }
    }

    @Nested
    inner class Deletion {
        @Test
        fun `should delete workspace`() {
            ...
        }
    }
}
```

### Create Test Suite (Run Multiple Test Classes)

```kotlin
@Suite
@SelectPackages("com.scriptmanager.integration.workspace")
class WorkspaceTestSuite
```

---

## 🎨 Visual Guide

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Application                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  REST API (External Interface)                                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  /workspace  │   /folder    │   /script    │     /ai      │ │
│  │              │              │              │              │ │
│  │  GET/POST/   │  GET/POST/   │  GET/POST/   │  POST        │ │
│  │  PUT/DELETE  │  PUT/DELETE  │  PUT/DELETE  │              │ │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘ │
│         │              │              │              │           │
│         ▼              ▼              ▼              ▼           │
│  ┌─────────────────────────────────┬─────────────────────────┐ │
│  │  ScriptManager Domain           │  AI Domain              │ │
│  │  ┌──────────────────────────┐   │  ┌──────────────────┐  │ │
│  │  │ Commands:                │   │  │ Commands:        │  │ │
│  │  │ - CreateWorkspace        │   │  │ - CreateAiProfile│  │ │
│  │  │ - CreateFolder           │   │  │ - CreateModelCfg │  │ │
│  │  │ - CreateScript           │   │  └──────────────────┘  │ │
│  │  │ - Update*/Delete*        │   │                         │ │
│  │  └──────────────────────────┘   │                         │ │
│  └─────────────────────────────────┴─────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                            │ │
│  │   (workspace, folder, script, ai_profile, model_config)     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Test Flow Example: Workspace Creation

```
Frontend               REST API            Domain              Test
   │                      │                   │                  │
   ├─ POST /workspace ───►│                   │                  │
   │                      │                   │                  │
   │                      ├─ Route to ───────►│ ScriptManager    │
   │                      │   controller       │   Domain         │
   │                      │                   │                  │
   │                      │                   ├─ CreateWorkspace │
   │                      │                   │   Command         │
   │                      │                   │                  │
   │                      │                   ├─ Save to DB      │
   │                      │                   │                  │
   │                      │                   ├─ Emit Event ─────┤
   │                      │                   │   WorkspaceCreated│
   │                      │                   │                  │
   │◄─ WorkspaceDTO ──────┤◄─ Return result ──┤                  │
   │                      │                   │                  │
   │                                                              │
   └─────────────────────────────────────────────────────────────┤
                                                                  │
                  Test verifies:                                 │
                  ✅ WorkspaceDTO returned                        │
                  ✅ Event emitted to DB                          │
                  ✅ Workspace persisted                          │
                                                                  ▼
                                        workspace/WorkspaceCreationTest.kt
```

### Multi-Domain Coverage

```
┌────────────────────────────────────────────────────────┐
│              TestSuite (Master Suite)                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ScriptManager Domain Tests                            │
│  ├── workspace/WorkspaceCreationTest.kt                │
│  ├── workspace/WorkspaceManagementTest.kt              │
│  ├── folder/FolderCreationTest.kt                      │
│  └── script/ScriptLifecycleTest.kt                     │
│                                                         │
│  AI Domain Tests                                        │
│  ├── ai/AiProfileTest.kt                               │
│  └── ai/ModelConfigTest.kt                             │
│                                                         │
└────────────────────────────────────────────────────────┘

Run all: ./gradlew test --tests "TestSuite"
```

### Key Principle

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  Test Structure = API Structure (Not Domain Structure)  │
│                                                          │
│  ✅ /workspace → workspace/WorkspaceTest.kt             │
│  ✅ /folder → folder/FolderTest.kt                      │
│  ✅ /ai/ai-profile → ai/AiProfileTest.kt                │
│                                                          │
│  ❌ scriptmanager domain → scriptmanager/Test.kt        │
│  ❌ ai domain → ai/Test.kt                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Coverage Status

### ✅ Implemented Tests

| Resource     | API Endpoint               | Test Class              | Domain        | Status |
|--------------|----------------------------|-------------------------|---------------|--------|
| Workspace    | POST /workspace            | WorkspaceCreationTest   | scriptmanager | ✅      |
| Workspace    | PUT/DELETE /workspace/{id} | WorkspaceManagementTest | scriptmanager | ✅      |
| Folder       | POST /folder               | FolderCreationTest      | scriptmanager | ✅      |
| Script       | POST/PUT/DELETE /script    | ScriptLifecycleTest     | scriptmanager | ✅      |
| AI Profile   | POST /ai/ai-profile        | AiProfileTest           | ai            | ✅      |
| Model Config | POST /ai/model-config      | ModelConfigTest         | ai            | ✅      |

### 🔄 Next Steps (Expand Coverage)

| Resource  | API Endpoint                | Suggested Test Class |
|-----------|-----------------------------|----------------------|
| Folder    | PUT/DELETE /folder/{id}     | FolderManagementTest |
| Folder    | POST /folder/{id}/subfolder | FolderHierarchyTest  |
| Script    | POST /script/markdown       | MarkdownTest         |
| Script    | POST /script/{id}/history   | ScriptHistoryTest    |
| AppState  | PUT /appstate               | AppStateTest         |
| Workspace | POST /workspace/{id}/folder | WorkspaceFolderTest  |

### Quick Reference Table

| Want to Test          | Look Here                            | Covers Domain |
|-----------------------|--------------------------------------|---------------|
| POST /workspace       | workspace/WorkspaceCreationTest.kt   | scriptmanager |
| PUT /workspace/{id}   | workspace/WorkspaceManagementTest.kt | scriptmanager |
| POST /folder          | folder/FolderCreationTest.kt         | scriptmanager |
| POST /script          | script/ScriptLifecycleTest.kt        | scriptmanager |
| POST /ai/ai-profile   | ai/AiProfileTest.kt                  | ai            |
| POST /ai/model-config | ai/ModelConfigTest.kt                | ai            |

---

## 🔧 Troubleshooting

### Tests Hang or Slow

- Check if Testcontainer is already running
- Verify PostgreSQL container has enough resources
- Use `--info` flag to see detailed output

### Tests Fail with "Relation does not exist"

- Schema not applied correctly
- Check `TestcontainersConfiguration.applySchemaFromFile()`
- Verify `schema.sql` exists in `src/test/resources/`

### Event Not Found in Repository

- Events are truncated in `@BeforeEach`
- Make sure you're filtering events correctly
- Check event type string matches exactly (case-sensitive)

### Repository Not Found / Dependency Injection Issues

- Verify repository is injected in constructor
- Check `@SpringBootTest` annotation is present
- Ensure test class extends `BaseTest`

### Tests Interfering With Each Other

- Use unique test data: `"Test_${System.currentTimeMillis()}"`
- Add `@BeforeEach` to clean up additional tables if needed
- Check that `BaseTest.truncateEventsBeforeEachTest()` is running

### Model Config Validation Errors

- Valid model sources: `OPENAI`, `AZURE_OPENAI`
- Invalid: `AZURE`, `GPT4`, `INVALID_SOURCE`
- Use `assertThrows` to test validation errors

---

## 💡 IntelliJ IDEA Shortcuts

### Run Test

- **Run test at cursor**: `Ctrl + Shift + R` (or right-click → Run)
- **Run test class**: `Ctrl + Shift + R` on class name
- **Re-run last test**: `Ctrl + R`
- **Debug test**: `Ctrl + Shift + D`

### GitHub Copilot

- **Open Copilot Chat**: `Ctrl + Shift + /`
- **Trigger inline suggestions**: `Option + \`
- **Accept suggestion**: `Tab`
- **Next suggestion**: `Option + ]`
- **Previous suggestion**: `Option + [`

---

## 🎯 Success Criteria

Your testing strategy is successful when:

✅ **All API endpoints have test coverage** (workspace, folder, script, AI, appstate)  
✅ **All domains tested** (scriptmanager domain + ai domain)  
✅ **Each test runs independently** (no shared state issues)  
✅ **Tests run fast** (<5 minutes for full suite)  
✅ **High confidence in changes** (can refactor safely)  
✅ **Event-driven behavior verified** (all events tested)  
✅ **Real database tested** (no H2/in-memory surprises in prod)

---

## ✅ Test Checklist

When adding a new test:

1. **Extend BaseTest**
   ```kotlin
   @SpringBootTest
   class MyTest(
       private val eventRepository: EventRepository,
       private val commandInvoker: CommandInvoker
   ) : BaseTest(eventRepository)
   ```

2. **Document which API it tests**
   ```kotlin
   /**
    * Tests for XYZ API
    * Maps to: POST /api/endpoint
    * Domain: com.scriptmanager.domain.xyz
    */
   ```

3. **Use descriptive test names**
   ```kotlin
   @Test
   fun `should emit EventName when doing action`()
   ```

4. **Follow AAA pattern**
   ```kotlin
   // Arrange
   val input = ...
   
   // Act
   val result = commandInvoker.invoke(input)
   
   // Assert
   assertEquals(expected, result)
   ```

5. **Verify event emission**
   ```kotlin
   val events = eventRepository.findAll()
       .filter { it.eventType == "ExpectedEvent" }
   assertEquals(1, events.size)
   ```

6. **Use unique test data**
   ```kotlin
   val name = "Test_${System.currentTimeMillis()}"
   ```

7. **Test both success and error cases**
   ```kotlin
   @Test
   fun `should create successfully`() { ... }
   
   @Test
   fun `should throw error for invalid input`() {
       assertThrows(IllegalArgumentException::class.java) { ... }
   }
   ```

---

## 📚 Additional Resources

- **JUnit 5 Documentation**: https://junit.org/junit5/docs/current/user-guide/
- **Testcontainers**: https://testcontainers.com/
- **Spring Boot Testing**: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing
- **AssertJ** (better assertions): https://assertj.github.io/doc/
- **Kotlin Testing Best Practices**: https://kotlinlang.org/docs/jvm-test-using-junit.html

---

## 📋 Summary

### What Was Implemented

**Documentation:**

- ✅ This comprehensive guide combining all testing documentation

**Test Infrastructure:**

- ✅ BaseTest.kt - Base class with automatic event cleanup
- ✅ TestcontainersConfiguration.kt - PostgreSQL testcontainer setup
- ✅ TestSuite.kt - Master test suite covering all domains

**ScriptManager Domain Tests:**

- ✅ workspace/WorkspaceCreationTest.kt - Tests POST /workspace
- ✅ workspace/WorkspaceManagementTest.kt - Tests PUT/DELETE /workspace
- ✅ folder/FolderCreationTest.kt - Tests POST /folder
- ✅ script/ScriptLifecycleTest.kt - Tests POST/PUT/DELETE /script

**AI Domain Tests:**

- ✅ ai/AiProfileTest.kt - Tests POST /ai/ai-profile
- ✅ ai/ModelConfigTest.kt - Tests POST /ai/model-config (with error validation)

### Key Takeaways

1. **Resource-Based Organization** ✅ - Tests organized by API endpoints, not domains
2. **Multi-Domain Support** ✅ - Both scriptmanager and ai domains covered
3. **Real Database Testing** ✅ - PostgreSQL via Testcontainers, no mocks
4. **Event-Driven Verification** ✅ - All tests verify events are emitted correctly
5. **Clean Test Isolation** ✅ - Each test starts with clean event state

### Next Steps

1. Run existing tests: `./gradlew test`
2. View report: `open build/reports/tests/test/index.html`
3. Expand coverage for remaining endpoints
4. Add relationship tests (parent-child cascades)
5. Add more edge case tests (error handling)

---

**Remember:** Test the API contract (what users see), not the internal domain structure!

**Last Updated**: January 3, 2026

