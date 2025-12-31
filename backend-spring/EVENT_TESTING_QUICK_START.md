# Event Testing - Quick Reference

## 🚀 Quick Start

Want to test events in your command handlers? You have two options:

### Option 1: Fast Integration Tests (Pass EventQueue) ⚡✅

```kotlin
@Test
fun `test with event queue - FAST + COMPLETE`() {
    // Create test queue
    val testQueue = SmartEventQueue()

    // Execute command with queue
    val result = commandInvoker.invoke(
        CreateWorkspaceCommand("Test"),
        testQueue  // ← Pass queue here
    )

    // Get ALL events directly from queue (including cascading!)
    val primaryEvent = testQueue.allEvents[0].event as WorkspaceCreatedEvent
    assertEquals(result.name, primaryEvent.workspace.name)

    // If policies created secondary events, they're also in the queue!
    val allEvents = testQueue.allEvents
    // Can check for secondary events here ✅
}
```

**✅ Fast** | **✅ Complete flow** | **✅ Cascading events** | **✅ Direct access**

### Option 2: Complete Integration Tests (Query Database) 🔍

```kotlin
@Test
fun `test with event repository - COMPLETE + METADATA`() {
    // Execute command normally
    val result = commandInvoker.invoke(
        CreateWorkspaceCommand("Test")
    )

    // Query events from database
    val events = eventRepository.findAll()
        .filter { it.eventType == "WorkspaceCreatedEvent" }

    val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(
        events.first().event
    )
    assertEquals(result.name, eventData.workspace.name)

    // You also get metadata ✅
    assertNotNull(events.first().requestId)
    assertNotNull(events.first().createdAt)
}
```

**✅ Complete flow** | **✅ Cascading events** | **✅ Full metadata** | **🐌 Slower (DB queries)**

---

## 🎯 Which One Should I Use?

| Use Case                                          | Recommended               |
|---------------------------------------------------|---------------------------|
| Testing handler emits correct event               | **Option 1** (Queue)      |
| Testing event content/data                        | **Option 1** (Queue)      |
| Fast feedback during development                  | **Option 1** (Queue)      |
| Testing cascading events (event → policy → event) | **Option 1** (Queue) ✅    |
| Testing @EventListener reactions                  | **Option 1** (Queue) ✅    |
| Complete end-to-end testing                       | **Option 1** (Queue) ✅    |
| Testing event metadata from DB (timestamps, etc)  | **Option 2** (Repository) |
| Verifying event persistence                       | **Option 2** (Repository) |

**Key Change:** Option 1 now **DOES test the complete flow** including policies and cascading events!

**Best Practice:** Use **Option 1** for most tests (fast + complete). Use **Option 2** only when you need to verify DB
metadata!

---

## 📚 Full Documentation

See [EVENT_TESTING_GUIDE.md](./EVENT_TESTING_GUIDE.md) for complete details, examples, and best practices.

## 📝 Example Test Files

- **`EventTestingWithQueueExamples.kt`** - 9 examples using test EventQueue (Option 1)
- **`EventTestingExamples.kt`** - 7 examples using EventRepository (Option 2)

## ⚙️ Implementation

The `CommandInvoker.invoke()` method accepts an optional `EventQueue` parameter:

```kotlin
interface CommandInvoker {
    fun <R> invoke(
        command: Command<R>,
        eventQueue: EventQueue? = null  // ← Optional for testing
    ): R
}
```

When you pass a queue:

- Events are captured in the queue
- Event dispatching is skipped (no @EventListener calls)
- No event persistence to database
- ⚡ Much faster execution

When you don't pass a queue (normal operation):

- Events are dispatched to @EventListeners
- Events are persisted to database
- Policies and side effects are triggered
- Full production behavior

---

## 🚫 What NOT to Do

**❌ Don't modify `CommandHandler` to return events**

```kotlin
// ❌ BAD - Don't do this!
interface CommandHandler<T, R> {
    fun handle(eventQueue: EventQueue, command: T): Pair<R, List<Event>>
}
```

**Why?**

- ❌ Breaks single responsibility
- ❌ Misses cascading events (event → policy → event)
- ❌ Loses event metadata (timestamps, context)
- ❌ Tight coupling between tests and handlers

**✅ Instead:** Use one of the two recommended options above!

---

Happy testing! 🎉

