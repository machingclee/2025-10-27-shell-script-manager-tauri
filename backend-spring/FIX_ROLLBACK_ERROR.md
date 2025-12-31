# ✅ FIXED: "Unable to rollback against JDBC Connection" Error

## The Problem

You were getting this error:

```
Unable to rollback against JDBC Connection
```

### Root Cause

The issue was caused by **transaction conflict** between:

1. **Spring Test's `@Transactional`** - Wraps the entire test method in a transaction that tries to rollback at the end
2. **CommandInvoker's `TransactionTemplate`** - Creates and **commits** its own transaction

### What Was Happening

```
┌─────────────────────────────────────────────────────┐
│ Test Method (with @Transactional)                  │
│   ↓ Opens transaction T1                           │
│   ├─ commandInvoker.invoke()                       │
│   │    ↓ Opens NEW transaction T2                  │
│   │    ├─ handler.handle()                         │
│   │    ├─ dispatcher.dispatch()                    │
│   │    └─ TransactionTemplate commits T2 ✅         │
│   │                                                 │
│   └─ Test ends, tries to rollback T1 ❌            │
│      ERROR: "Unable to rollback against JDBC       │
│              Connection" because nested             │
│              transaction was already committed      │
└─────────────────────────────────────────────────────┘
```

Spring Test's `@Transactional` tries to rollback the outer transaction, but the inner transaction (from
`CommandInvoker`) was already committed, causing a conflict.

---

## The Solution

**Remove `@Transactional` from the test class** and use `@AfterEach` cleanup instead.

### Changes Made

#### Before (❌ Broken)

```kotlin
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
@Transactional  // ❌ Conflicts with CommandInvoker's TransactionTemplate
class EventTestingExamples(
    private val commandInvoker: CommandInvoker,
    private val eventRepository: EventRepository,
    private val objectMapper: ObjectMapper
) {
    @Test
    fun `test`() {
        commandInvoker.invoke(command)
        // Test transaction tries to rollback but fails ❌
    }
}
```

#### After (✅ Fixed)

```kotlin
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
// ✅ No @Transactional - let CommandInvoker manage its own transactions
class EventTestingExamples(
    private val commandInvoker: CommandInvoker,
    private val eventRepository: EventRepository,
    private val objectMapper: ObjectMapper
) {

    @AfterEach
    fun cleanup() {
        // Clear events created during tests to prevent interference
        eventRepository.deleteAll()
    }

    @Test
    fun `test`() {
        commandInvoker.invoke(command)
        // CommandInvoker commits its transaction successfully ✅
    }
}
```

### Why This Works

1. **No transaction conflict** - Test doesn't wrap CommandInvoker in a transaction
2. **CommandInvoker controls transactions** - Uses `TransactionTemplate` to commit properly
3. **Manual cleanup** - `@AfterEach` cleans up test data without rollback

---

## Alternative Cleanup Strategies

### Option 1: Delete All (Current Approach)

```kotlin
@AfterEach
fun cleanup() {
    eventRepository.deleteAll()
}
```

✅ Simple and fast  
⚠️ Only clears events, not workspaces

### Option 2: @DirtiesContext (Rebuild Context)

```kotlin
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class EventTestingExamples(...) {
    // Spring context rebuilt after each test
}
```

✅ Complete cleanup  
❌ Very slow (rebuilds entire Spring context)

### Option 3: Testcontainers Recreation

```kotlin
@SpringBootTest
@Testcontainers
class EventTestingExamples(...) {
    companion object {
        @Container
        val postgres = PostgreSQLContainer<Nothing>("postgres:15")
            .apply {
                withReuse(false)  // Create fresh DB for each test
            }
    }
}
```

✅ Fresh database per test  
❌ Slower than @AfterEach cleanup

### Option 4: SQL Cleanup Script

```kotlin
@AfterEach
fun cleanup() {
    jdbcTemplate.execute("TRUNCATE TABLE event CASCADE")
    jdbcTemplate.execute("TRUNCATE TABLE workspace CASCADE")
}
```

✅ Fast and complete  
⚠️ Need to add JdbcTemplate dependency

---

## Why Not Use @Transactional in Tests?

### When @Transactional in Tests WORKS ✅

- Testing repository methods directly
- Testing service methods that don't create their own transactions
- Spring manages all transactions transparently

### When @Transactional in Tests FAILS ❌

- Testing code that uses `TransactionTemplate` (like `CommandInvoker`)
- Testing code that uses `@Transactional(propagation = REQUIRES_NEW)`
- Testing code that explicitly commits transactions

**Your case:** CommandInvoker uses `TransactionTemplate`, so `@Transactional` in tests conflicts.

---

## Best Practices for Your Tests

### ✅ DO

```kotlin
@SpringBootTest
@ActiveProfiles("test")
class MyIntegrationTest(...) {

    @AfterEach
    fun cleanup() {
        // Clean up test data
        eventRepository.deleteAll()
    }

    @Test
    fun `test something`() {
        // CommandInvoker manages its own transactions
        commandInvoker.invoke(command)

        // Assert on results
        val events = eventRepository.findAll()
        assertEquals(1, events.size)
    }
}
```

### ❌ DON'T

```kotlin
@SpringBootTest
@Transactional  // ❌ Don't use with CommandInvoker
class MyIntegrationTest(...) {

    @Test
    fun `test something`() {
        commandInvoker.invoke(command)  // ❌ Will cause rollback error
    }
}
```

---

## Summary

**Problem:** `@Transactional` on test class conflicts with `CommandInvoker`'s `TransactionTemplate`

**Solution:** Remove `@Transactional`, use `@AfterEach` cleanup instead

**Result:** Tests now work without rollback errors! ✅

---

## Files Modified

- ✅ `EventTestingExamples.kt`
    - Removed `@Transactional` annotation
    - Added `@AfterEach` cleanup method
    - Added imports for `AfterEach`
    - Improved test isolation with unique workspace names
    - Added filtering by workspace name to avoid test interference

Tests should now run successfully without the "Unable to rollback against JDBC Connection" error!

