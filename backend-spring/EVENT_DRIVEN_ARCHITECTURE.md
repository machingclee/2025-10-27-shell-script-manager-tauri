# Event-Driven Architecture: Script Execution Recording

## Overview

Implemented a proper event-driven architecture for recording script executions from external systems using domain events
and policy-based side effects.

## Architecture Pattern

### Flow Diagram

```
External Backend
    ↓
POST /scripts/events/script-executed/scripts/{scriptId}
    ↓
ScriptController.recordScriptExecution()
    ↓
Publishes: ScriptExecutedEvent(scriptId)
    ↓
Spring Event System
    ↓
RecordExecutedCommandIntoHistoryPolicy
    ↓
commandInvoker.invoke(CreateScriptHistoryCommand)
    ↓
CreateScriptHistoryHandler
    ↓
1. Updates/Creates HistoricalShellScript in DB
2. Emits: ScriptHistoryCreatedEvent to eventQueue
    ↓
DomainEventLogger records in audit log
    ↓
Spring publishes ScriptHistoryCreatedEvent
```

## Components

### 1. Domain Event: `ScriptExecutedEvent`

```kotlin
data class ScriptExecutedEvent(
    val scriptId: Int
)
```

- **Purpose**: Signals that a script was executed successfully by external system
- **Published by**: Controller (integration point with external backend)
- **Consumed by**: Policies that need to react to script executions

### 2. Controller Endpoint

```kotlin
@PostMapping("/events/script-executed/scripts/{scriptId}")
fun recordScriptExecution(@PathVariable scriptId: Int): ApiResponse<Unit> {
    applicationEventPublisher.publishEvent(ScriptExecutedEvent(scriptId))
    return ApiResponse()
}
```

- **Role**: Integration point for external backend
- **Responsibility**: Publish domain event, nothing more
- **Does NOT**: Directly manipulate data or invoke commands

### 3. Policy: `RecordExecutedCommandIntoHistoryPolicy`

```kotlin
@Component
class RecordExecutedCommandIntoHistoryPolicy(
    private val commandInvoker: CommandInvoker
) {
    @EventListener
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        val command = CreateScriptHistoryCommand(
            scriptId = event.scriptId,
            time = System.currentTimeMillis()
        )
        commandInvoker.invoke(command)
    }
}
```

- **Role**: Business rule enforcement through event reaction
- **Responsibility**: "When a script is executed, create a history record"
- **Benefits**:
    - Decouples execution recording from history creation
    - Easy to add more policies for other side effects
    - Single Responsibility Principle

### 4. Command: `CreateScriptHistoryCommand`

```kotlin
data class CreateScriptHistoryCommand(
    val scriptId: Int,
    val time: Long
) : Command<Unit>
```

- **Role**: Intent to create/update history record
- **Executed by**: `CreateScriptHistoryHandler`
- **Side Effects**:
    - Persists history to database
    - Emits `ScriptHistoryCreatedEvent`
    - Recorded in audit log

## Why This Architecture?

### ✅ Benefits

1. **Separation of Concerns**
    - Controller: HTTP integration only
    - Policy: Business rule enforcement
    - Command Handler: State mutation

2. **Event-Driven**
    - Loose coupling between components
    - Easy to add new reactions to script executions
    - Policies can trigger additional commands

3. **Audit Trail**
    - Original event (`ScriptExecutedEvent`) captured at integration boundary
    - Command (`CreateScriptHistoryCommand`) recorded in audit log
    - Resulting event (`ScriptHistoryCreatedEvent`) also recorded

4. **Testability**
    - Can test policy independently
    - Can mock event publishing
    - Can verify event handling

5. **Extensibility**
    - Want to send notifications when scripts execute? Add another `@EventListener`
    - Want to update metrics? Add another policy
    - No changes to existing code needed

### ❌ Anti-Pattern (What We Avoided)

**DON'T DO THIS:**

```kotlin
@PostMapping("/events/script-executed/scripts/{scriptId}")
fun recordScriptExecution(@PathVariable scriptId: Int): ApiResponse<Unit> {
    // WRONG: Controller directly creates history
    val history = HistoricalShellScript(...)
    repository.save(history)
    return ApiResponse()
}
```

**Problems:**

- Controller has too many responsibilities
- Hard to add side effects
- No audit trail
- Violates Single Responsibility Principle
- Not event-driven

## Event Comparison

### Integration Event: `ScriptExecutedEvent`

- **Published by**: Controller (boundary/adapter layer)
- **Scope**: External system integration
- **Purpose**: Signal external event happened
- **Listeners**: Policies (application layer)
- **NOT recorded in audit log**: It's an integration signal, not a domain command

### Domain Event: `ScriptHistoryCreatedEvent`

- **Published by**: Command Handler (domain layer)
- **Scope**: Internal domain model
- **Purpose**: Signal state change occurred
- **Listeners**: Other domain policies, projections, read models
- **Recorded in audit log**: Part of event sourcing

## Usage Example

### External Backend Calls Your API

```bash
curl -X POST http://localhost:7070/scripts/events/script-executed/scripts/123
```

### What Happens:

1. ✅ `ScriptExecutedEvent(123)` published
2. ✅ `RecordExecutedCommandIntoHistoryPolicy` catches it
3. ✅ `CreateScriptHistoryCommand(123, timestamp)` invoked
4. ✅ Command recorded in audit log
5. ✅ History record created/updated in database
6. ✅ `ScriptHistoryCreatedEvent` emitted
7. ✅ Event recorded in audit log

### Result:

- External system successfully integrated
- History automatically recorded
- Full audit trail maintained
- Clean separation of concerns

## Adding More Side Effects

Want to add more reactions to script execution? Easy:

```kotlin
@Component
class NotifyOnScriptExecution(
    private val notificationService: NotificationService
) {
    @EventListener
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        notificationService.send("Script ${event.scriptId} executed!")
    }
}
```

No changes to existing code needed! 🎯

## Key Takeaways

1. **Controllers**: Integration points, publish events
2. **Policies**: Business rules, react to events, invoke commands
3. **Commands**: State mutation, emit domain events
4. **Events**: Communication between layers
5. **Audit Log**: Everything flows through CommandInvoker for traceability

This is proper Domain-Driven Design + Event-Driven Architecture! ✨

