# Event Testing Guide

## TL;DR - Quick Answer

You have **TWO GOOD OPTIONS** for testing events:

**✅ Option 1:** Pass a test `EventQueue` to `commandInvoker.invoke()` (Unit testing approach)  
**✅ Option 2:** Query events from `EventRepository` (Integration testing approach)

**❌ DON'T:** Modify `CommandHandler` to return `Event`

## Which Option Should I Use?

| Aspect                | Option 1: Test EventQueue                 | Option 2: EventRepository                |
|-----------------------|-------------------------------------------|------------------------------------------|
| **Speed**             | ⚡⚡ Fastest (direct access, no DB queries) | 🐌 Slower (needs DB queries)             |
| **Isolation**         | ❌ Full integration (policies execute)     | ❌ Full integration (policies execute)    |
| **Cascading Events**  | ✅ ALL events captured in queue            | ✅ ALL events persisted to DB             |
| **Event Metadata**    | ❌ No DB persistence metadata              | ✅ Full metadata (requestId, timestamps)  |
| **Real Flow Testing** | ✅ Complete flow (dispatch + policies)     | ✅ Complete flow (dispatch + policies)    |
| **Direct Access**     | ✅ Get events from queue immediately       | ❌ Must query from database               |
| **Best For**          | Fast integration tests with direct access | When you need event persistence metadata |

**Key Change:** Option 1 now **DOES dispatch events and trigger policies**! The test queue acts as a "spy" that captures
all events while allowing the full event flow to proceed.

**Recommendation:** Use **Option 1** for most tests (fast + complete)! Use **Option 2** only when you specifically need
to verify event persistence metadata.

---

## Option 1: Pass Test EventQueue to CommandInvoker (RECOMMENDED FOR MOST TESTS)

### Implementation

First, modify your `CommandInvoker` interface to accept an optional `EventQueue`:

```kotlin
interface CommandInvoker {
    fun <T : Any, R> invoke(
        handler: CommandHandler<T, R>,
        command: T,
        eventQueue: EventQueue? = null  // ← Add this
    ): R

    fun <R> invoke(
        command: Command<R>,
        eventQueue: EventQueue? = null  // ← Add this
    ): R
}
```

Then update `OneTransactionCommandInvoker` to use the provided queue:

```kotlin
override fun <T : Any, R> invoke(
    handler: CommandHandler<T, R>,
    command: T,
    eventQueue: EventQueue?
): R {
    val requestId = MDC.get("requestId") ?: UUID.randomUUID().toString()
    MDC.put("requestId", requestId)

    return transactionTemplate.execute { _ ->
        // Use provided queue for testing, or create new one for production
        val queue = eventQueue ?: SmartEventQueue()

        // Log command
        val commandEvent = commandAuditor.logCommandInTransaction(command, requestId)

        // Execute handler
        val result = handler.handle(queue, command)

        // Only dispatch if not testing (no external queue provided)
        if (eventQueue == null) {
            domainEventDispatcher.dispatch(queue, requestId)
        }

        commandEvent.success = true
        eventRepository.save(commandEvent)

        result
    } ?: throw IllegalStateException("Transaction failed")
}
```

### Usage in Tests

```kotlin
@Test
fun `should emit WorkspaceCreatedEvent when creating workspace`() {
    // Arrange
    val testQueue = SmartEventQueue()
    val command = CreateWorkspaceCommand("Test Workspace")

    // Act
    val result = commandInvoker.invoke(command, testQueue)

    // Assert - Get events directly from queue
    val events = testQueue.allEvents
    assertEquals(1, events.size)

    val event = events.first().event as WorkspaceCreatedEvent
    assertEquals("Test Workspace", event.workspace.name)
    assertEquals(result.id, event.workspace.id)
}
```

### Benefits of Option 1

✅ **Fast** - No database interaction  
✅ **Isolated** - Tests only the handler logic  
✅ **Direct access** - Get events immediately without querying  
✅ **No mocking** - Real EventQueue implementation  
✅ **Type-safe** - Direct access to event objects

### Limitations of Option 1

❌ **No DB metadata** - Won't have persistence timestamps from database  
⚠️ **Database still used** - Transactions and command audit still happen

**But you DO get:**

✅ **Cascading events** - Policies execute and create secondary events  
✅ **@EventListener called** - Full event dispatching happens  
✅ **Complete flow** - Tests entire command execution including policies  
✅ **Direct access** - Get all events immediately from queue

**How it works:**

The test `eventQueue` acts as a **"spy"** - it captures all events while allowing the normal event flow to proceed:

```kotlin
// In OneTransactionCommandInvoker.invoke()
val queue = eventQueue ?: SmartEventQueue()

val result = handler.handle(queue, command)

// ✅ ALWAYS dispatch events (even with test queue)
domainEventDispatcher.dispatch(queue, requestId)
```

This means:

- ✅ Primary events from handler ARE captured in test queue
- ✅ `@EventListener` methods ARE called
- ✅ Policies DO execute
- ✅ Secondary/cascading events ARE created and captured in queue

**Example of what you GET:**

```kotlin
val testQueue = SmartEventQueue()
commandInvoker.invoke(ExecuteScriptCommand(scriptId), testQueue)

// Primary event in queue ✅
val primaryEvent = testQueue.allEvents[0].event as ScriptExecutedEvent

// @EventListener WAS called ✅
// Policy executed ✅
// Secondary event also in queue ✅
val secondaryEvent = testQueue.allEvents[1].event as ScriptHistoryCreatedEvent
```

The testQueue captures **ALL events** including cascading ones!

### When to Use Option 1

- ✅ Fast integration tests with direct event access
- ✅ Testing event content and data
- ✅ Fast feedback during development
- ✅ Testing edge cases and error scenarios
- ✅ When you don't care about event propagation

---

## Option 2: Query Events from EventRepository (RECOMMENDED FOR INTEGRATION TESTS)

### Why Use EventRepository?

1. **Breaks Single Responsibility Principle**
    - CommandHandler's job is domain logic, not event management
    - Mixing concerns makes the code harder to maintain

2. **Can't Handle Cascading Events**
    - Events can trigger other events via policies
    - Example: `ScriptExecutedEvent` → `RecordExecutedCommandIntoHistoryPolicy` → `ScriptHistoryCreatedEvent`
    - Returning only the first event means you miss secondary events

3. **Loses Important Context**
    - `EventWrapper` contains crucial metadata: requestId, userEmail, MDC context
    - Simple return value can't capture this rich context

4. **Tight Coupling**
    - Tests become dependent on handler implementation
    - Changes to handler internals break tests

### ✅ Benefits of Querying from EventRepository

1. **Tests Real Behavior**
    - Verifies the complete flow: Command → Handler → EventQueue → Dispatcher → Persistence
    - Ensures events are actually stored in production

2. **Captures ALL Events**
    - Sees primary events from handlers
    - Sees secondary events from policies
    - Sees cascading events from event-triggered commands

3. **Access to Full Event Data**
    - Event content (the domain event itself)
    - Metadata (requestId, userEmail, timestamps)
    - Success/failure status
    - Context information

4. **Flexible Assertions**
    - Query by event type, requestId, user, timestamp
    - Test event ordering
    - Verify event content matches expectations

## How Your Event System Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Command is invoked                                           │
│    commandInvoker.invoke(CreateWorkspaceCommand("Test"))        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CommandHandler processes command                             │
│    - Creates/modifies domain entities                           │
│    - Adds events to EventQueue                                  │
│      eventQueue.add(WorkspaceCreatedEvent(workspace))           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. DomainEventDispatcher publishes events                       │
│    - Wraps events with context (EventWrapper)                   │
│    - Publishes to Spring's ApplicationEventPublisher            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Event Listeners react (@EventListener)                       │
│    - DomainEventLogger persists to EventRepository              │
│    - Policies execute business logic (may invoke new commands)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Events persisted in database                                 │
│    - Available for querying in tests via EventRepository        │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Patterns

### Pattern 1: Basic Event Verification

```kotlin
@Test
fun `should emit WorkspaceCreatedEvent when creating workspace`() {
    // Arrange
    val command = CreateWorkspaceCommand("Test Workspace")

    // Act
    val result = commandInvoker.invoke(command)

    // Assert - Query from repository
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }
        .sortedByDescending { it.createdAt }

    assertEquals(1, events.size)
    assertTrue(events.first().success)
}
```

### Pattern 2: Verify Event Content

```kotlin
@Test
fun `event should contain correct workspace data`() {
    // Arrange
    val command = CreateWorkspaceCommand("My Workspace")

    // Act
    val workspace = commandInvoker.invoke(command)

    // Assert
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }
        .sortedByDescending { it.createdAt }

    val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(
        events.first().event
    )

    assertEquals(workspace.id, eventData.workspace.id)
    assertEquals(workspace.name, eventData.workspace.name)
}
```

### Pattern 3: Test Cascading Events

```kotlin
@Test
fun `should create history event when script is executed`() {
    // Arrange
    val script = createTestScript()

    // Act - Execute script (emits ScriptExecutedEvent)
    commandInvoker.invoke(ExecuteScriptCommand(script.id))

    // Wait for async processing if needed
    Thread.sleep(100)

    // Assert - Verify both primary and secondary events
    val allEvents = eventRepository.findAll()

    // Primary event from handler
    val executedEvents = allEvents.filter {
        it.eventType == "ScriptExecutedEvent"
    }
    assertTrue(executedEvents.isNotEmpty())

    // Secondary event from policy
    val historyEvents = allEvents.filter {
        it.eventType == "ScriptHistoryCreatedEvent"
    }
    assertTrue(historyEvents.isNotEmpty())
}
```

### Pattern 4: Verify Event Metadata

```kotlin
@Test
fun `event should have correct metadata`() {
    // Act
    commandInvoker.invoke(CreateWorkspaceCommand("Test"))

    // Assert
    val event = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }
        .first()

    assertNotNull(event.requestId)
    assertNotNull(event.requestUserEmail)
    assertNotNull(event.createdAt)
    assertNotNull(event.createdAtHk)
    assertTrue(event.success)
    assertEquals("", event.failureReason)
}
```

### Pattern 5: Test Event Ordering

```kotlin
@Test
fun `events should be created in correct order`() {
    // Act - Create multiple items
    commandInvoker.invoke(CreateWorkspaceCommand("First"))
    Thread.sleep(10)
    commandInvoker.invoke(CreateWorkspaceCommand("Second"))
    Thread.sleep(10)
    commandInvoker.invoke(CreateWorkspaceCommand("Third"))

    // Assert
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }
        .sortedBy { it.createdAt }

    assertTrue(events.size >= 3)

    // Verify timestamps increase
    for (i in 0 until events.size - 1) {
        assertTrue(events[i].createdAt!! < events[i + 1].createdAt!!)
    }
}
```

## Helper Methods for Cleaner Tests

```kotlin
// Reusable helper methods
private fun assertEventExists(eventType: String) {
    val events = eventRepository.findAll().filter { it.eventType == eventType }
    assertTrue(events.isNotEmpty(), "Event '$eventType' should exist")
}

private inline fun <reified T> assertEventContains(
    eventType: String,
    assertions: (T) -> Unit
) {
    val events = eventRepository.findAll()
        .filter { it.eventType == eventType }
        .sortedByDescending { it.createdAt }

    assertFalse(events.isEmpty())
    val eventData = objectMapper.readValue<T>(events.first().event)
    assertions(eventData)
}

private fun getLatestEvent(eventType: String) =
    eventRepository.findAll()
        .filter { it.eventType == eventType }
        .maxByOrNull { it.createdAt ?: 0.0 }

// Usage in tests
@Test
fun `using helper methods`() {
    val result = commandInvoker.invoke(CreateWorkspaceCommand("Test"))

    assertEventExists("WorkspaceCreatedEvent")
    assertEventContains<WorkspaceCreatedEvent>("WorkspaceCreatedEvent") { event ->
        assertEquals(result.name, event.workspace.name)
    }
}
```

## Testing Strategy for Different Scenarios

### Scenario 1: Simple Command → Single Event

**Example:** `CreateWorkspaceCommand` → `WorkspaceCreatedEvent`

```kotlin
@Test
fun `create workspace emits single event`() {
    val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Test"))

    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }

    assertEquals(1, events.size)
}
```

### Scenario 2: Command → Event → Policy → Another Command → Another Event

**Example:** `ExecuteScriptCommand` → `ScriptExecutedEvent` → `RecordExecutedCommandIntoHistoryPolicy` →
`CreateScriptHistoryCommand` → `ScriptHistoryCreatedEvent`

```kotlin
@Test
fun `execute script triggers history creation`() {
    val script = createTestScript()

    commandInvoker.invoke(ExecuteScriptCommand(script.id))
    Thread.sleep(100) // Wait for async processing

    val events = eventRepository.findAll()

    // Primary event
    assertTrue(events.any { it.eventType == "ScriptExecutedEvent" })

    // Secondary event from policy
    assertTrue(events.any { it.eventType == "ScriptHistoryCreatedEvent" })
}
```

### Scenario 3: Command Emitting Multiple Events

**Example:** If a handler emits multiple events

```kotlin
@Test
fun `command can emit multiple events`() {
    commandInvoker.invoke(SomeComplexCommand())

    val events = eventRepository.findAll()

    assertTrue(events.any { it.eventType == "FirstEvent" })
    assertTrue(events.any { it.eventType == "SecondEvent" })
    assertTrue(events.any { it.eventType == "ThirdEvent" })
}
```

### Scenario 4: Testing Event Timing (Immediate vs Post-Commit)

Your system supports two timing modes:

- `eventQueue.add(event)` - IMMEDIATE dispatch
- `eventQueue.addTransactional(event)` - POST_COMMIT dispatch

```kotlin
@Test
fun `immediate events are dispatched right away`() {
    // Events added with eventQueue.add() are dispatched immediately
    commandInvoker.invoke(SomeCommand())

    // No need to wait - events should be there immediately
    val events = eventRepository.findAll()
        .filter { it.eventType == "SomeEvent" }

    assertTrue(events.isNotEmpty())
}

@Test
fun `transactional events are dispatched after commit`() {
    // Events added with eventQueue.addTransactional() wait for commit
    commandInvoker.invoke(SomeCommand())

    // They should still be persisted by the time we query
    val events = eventRepository.findAll()
        .filter { it.eventType == "SomeEvent" }

    assertTrue(events.isNotEmpty())
}
```

## Best Practices

### ✅ DO

1. **Query from EventRepository in tests**
   ```kotlin
   val events = eventRepository.findAll()
       .filter { it.eventType == "MyEvent" }
   ```

2. **Test the complete event data**
   ```kotlin
   val eventData = objectMapper.readValue<MyEvent>(event.event)
   assertEquals(expected, eventData.someField)
   ```

3. **Test event metadata**
   ```kotlin
   assertNotNull(event.requestId)
   assertTrue(event.success)
   ```

4. **Test cascading events**
   ```kotlin
   // Verify both primary and secondary events
   assertTrue(events.any { it.eventType == "PrimaryEvent" })
   assertTrue(events.any { it.eventType == "SecondaryEvent" })
   ```

5. **Use helper methods for common assertions**
   ```kotlin
   assertEventExists("MyEvent")
   assertEventContains<MyEvent>("MyEvent") { event ->
       assertEquals(expected, event.data)
   }
   ```

### ❌ DON'T

1. **Don't modify CommandHandler to return events**
   ```kotlin
   // ❌ Bad
   interface CommandHandler<T, R> {
       fun handle(eventQueue: EventQueue, command: T): Pair<R, List<Event>>
   }
   ```

2. **Don't directly access EventQueue in tests**
   ```kotlin
   // ❌ Bad - EventQueue is internal to command execution
   val queue = SmartEventQueue()
   handler.handle(queue, command)
   val events = queue.allEvents // Don't do this
   ```

3. **Don't forget to wait for async event processing**
   ```kotlin
   // ❌ Bad - May miss async events
   commandInvoker.invoke(command)
   val events = eventRepository.findAll()
   
   // ✅ Good - Wait if using @Async listeners
   commandInvoker.invoke(command)
   Thread.sleep(100)
   val events = eventRepository.findAll()
   ```

## Complete Example

See the following test files:

- **`EventTestingWithQueueExamples.kt`** - 9 examples using Option 1 (test EventQueue)
- **`EventTestingExamples.kt`** - 7 examples using Option 2 (EventRepository)

## Side-by-Side Comparison

### Testing the Same Scenario Both Ways

**Option 1: Test EventQueue (Fast, Unit Test)**

```kotlin
@Test
fun `should emit WorkspaceCreatedEvent - using test queue`() {
    // Arrange
    val testQueue = SmartEventQueue()

    // Act
    val workspace = commandInvoker.invoke(
        CreateWorkspaceCommand("Test"),
        testQueue  // ← Pass test queue
    )

    // Assert - Direct access
    val events = testQueue.allEvents
    val event = events.first().event as WorkspaceCreatedEvent

    assertEquals(workspace.name, event.workspace.name)
}
```

**Option 2: EventRepository (Complete, Integration Test)**

```kotlin
@Test
fun `should emit WorkspaceCreatedEvent - using repository`() {
    // Arrange & Act
    val workspace = commandInvoker.invoke(
        CreateWorkspaceCommand("Test")
        // ← No queue, normal execution
    )

    // Assert - Query from database
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }

    val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(
        events.first().event
    )

    assertEquals(workspace.name, eventData.workspace.name)
    assertNotNull(events.first().requestId)  // ← Extra metadata
    assertNotNull(events.first().createdAt)  // ← Timestamps
}
```

## Recommended Testing Strategy

Use **BOTH** approaches for comprehensive testing:

```kotlin
class WorkspaceCommandTests {

    // Unit tests with EventQueue - FAST
    @Nested
    inner class UnitTests {

        @Test
        fun `CreateWorkspaceCommand should emit correct event data`() {
            val testQueue = SmartEventQueue()
            val workspace = commandInvoker.invoke(
                CreateWorkspaceCommand("Unit Test"),
                testQueue
            )

            val event = testQueue.allEvents.first().event as WorkspaceCreatedEvent
            assertEquals(workspace.id, event.workspace.id)
            assertEquals(workspace.name, event.workspace.name)
        }

        @Test
        fun `should emit immediate event not transactional`() {
            val testQueue = SmartEventQueue()
            commandInvoker.invoke(CreateWorkspaceCommand("Test"), testQueue)

            assertTrue(testQueue.immediateEvents.isNotEmpty())
            assertTrue(testQueue.postCommitEvents.isEmpty())
        }
    }

    // Integration tests with EventRepository - COMPLETE
    @Nested
    inner class IntegrationTests {

        @Test
        fun `workspace creation should persist event with metadata`() {
            val workspace = commandInvoker.invoke(
                CreateWorkspaceCommand("Integration Test")
            )

            val events = eventRepository.findAll()
                .filter { it.eventType == "WorkspaceCreatedEvent" }

            assertTrue(events.isNotEmpty())
            assertNotNull(events.first().requestId)
            assertNotNull(events.first().createdAt)
            assertTrue(events.first().success)
        }

        @Test
        fun `event listeners should react to WorkspaceCreatedEvent`() {
            // Test that policies and listeners are triggered
            commandInvoker.invoke(CreateWorkspaceCommand("Test"))

            Thread.sleep(100) // Wait for async processing

            // Verify both primary and any secondary events
            val allEvents = eventRepository.findAll()
            assertTrue(allEvents.any { it.eventType == "WorkspaceCreatedEvent" })
            // Check for secondary events if policies create them
        }
    }
}
```

---

## Complete Example (Old Section)

1. Basic event verification
2. Event content testing
3. Cascading event testing
4. Metadata verification
5. Multiple events testing
6. Event ordering
7. Helper method patterns

## FAQ

**Q: What if I need to test events in isolation without the full Spring context?**

A: For unit tests, you can create a mock EventQueue and verify events were added:

```kotlin
@Test
fun `handler adds event to queue`() {
    val mockQueue = mockk<EventQueue>()
    val handler = CreateWorkspaceHandler(workspaceRepository)

    handler.handle(mockQueue, CreateWorkspaceCommand("Test"))

    verify { mockQueue.add(any<WorkspaceCreatedEvent>()) }
}
```

**Q: How do I test event content without querying the database?**

A: Use a mock or spy on EventQueue to capture events:

```kotlin
val capturedEvents = mutableListOf<Any>()
val queue = mockk<EventQueue> {
    every { add(any()) } answers {
        capturedEvents.add(firstArg())
    }
}

handler.handle(queue, command)

val event = capturedEvents.first() as WorkspaceCreatedEvent
assertEquals("Test", event.workspace.name)
```

**Q: Should I test events in unit tests or integration tests?**

A: Both!

- **Unit tests:** Test that handlers add correct events to queue (fast, isolated)
- **Integration tests:** Test that events are dispatched and persisted correctly (realistic, complete)

**Q: How do I handle flaky tests due to timing issues?**

A: Use proper synchronization:

```kotlin
// Option 1: Small delay for async processing
commandInvoker.invoke(command)
Thread.sleep(100)

// Option 2: Poll until event appears (more robust)
fun waitForEvent(eventType: String, timeout: Long = 1000) {
    val start = System.currentTimeMillis()
    while (System.currentTimeMillis() - start < timeout) {
        val events = eventRepository.findAll()
            .filter { it.eventType == eventType }
        if (events.isNotEmpty()) return
        Thread.sleep(50)
    }
    fail("Event $eventType not found within timeout")
}
```

## Summary

**You have TWO excellent approaches for testing events:**

### Option 1: Pass Test EventQueue to invoke()

- ✅ **Fast** - No database overhead
- ✅ **Isolated** - Pure unit tests
- ✅ **Direct** - Immediate event access
- ✅ **Type-safe** - Work with event objects directly
- ❌ **Limited** - No cascading events or metadata
- **Best for:** Unit testing handlers, fast development feedback

### Option 2: Query from EventRepository

- ✅ **Complete** - Tests entire event flow
- ✅ **Cascading** - Captures events from policies
- ✅ **Metadata** - Full event context and timestamps
- ✅ **Realistic** - Production-like testing
- ❌ **Slower** - Database queries required
- **Best for:** Integration testing, verifying complete behavior

**Recommendation:** Use **BOTH** for comprehensive test coverage!

### What NOT to do:

**❌ Don't modify CommandHandler to return events** - This causes:

- Mixed responsibilities
- Missed cascading events
- Lost context information
- Tight coupling between tests and implementation

Happy testing! 🎉

