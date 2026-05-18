# CQRS & Event-Driven Architecture in This Project

This document explains the CQRS (Command Query Responsibility Segregation) and event-driven patterns used in `backend-spring/`. Every concept is explained with reference to the real code in this repository and illustrated with equivalent Java examples.

---

## Table of Contents

1. [Overview](#overview)
2. [Command](#command)
3. [CommandHandler](#commandhandler)
4. [Query](#query)
5. [QueryHandler](#queryhandler)
6. [CommandInvoker](#commandinvoker)
7. [QueryInvoker](#queryinvoker)
8. [Domain Events](#domain-events)
9. [Policy](#policy)
10. [Annotations: `@NextCommand` and `@Invariant`](#annotations-nextcommand-and-invariant)
11. [EventQueue and Dispatch Timing](#eventqueue-and-dispatch-timing)
12. [DomainEventLogger](#domaineventlogger)
13. [Full Flow Walkthrough](#full-flow-walkthrough)

---

## Overview

The architecture separates **writes** (Commands) from **reads** (Queries). Write operations go through a `CommandInvoker` which:

1. Locates the correct `CommandHandler`
2. Runs the handler inside a transaction
3. Dispatches domain events collected in an `EventQueue`

Read operations go through a `QueryInvoker` which runs in a **read-only** transaction and never produces events.

Policies bridge the two sides: they listen to domain events and may issue new commands in response, creating reactive event-driven flows.

```
HTTP Request
     │
     ▼
  Controller
     │
     ├──(write)──► CommandInvoker ──► CommandHandler ──► DB
     │                                      │
     │                               EventQueue.add(event)
     │                                      │
     │                               DomainEventDispatcher
     │                                      │
     │                                  @EventListener
     │                                  Policy
     │                                      │
     │                               CommandInvoker.invoke(nextCommand)
     │
     └──(read)───► QueryInvoker ──► QueryHandler ──► DB (read-only)
```

---

## Command

A `Command` is a **data object** expressing intent to change state. It is parameterised with the return type `R`.

### Kotlin (actual code)

```kotlin
// Command.kt
interface Command<R>

// CreateWorkspaceCommand.kt
data class CreateWorkspaceCommand(
    val name: String
) : Command<Workspace>
```

### Java equivalent

```java
// Command.java
public interface Command<R> {}

// CreateWorkspaceCommand.java
public record CreateWorkspaceCommand(String name) implements Command<Workspace> {}
```

Commands are **plain data** — no behaviour, no dependencies. They live under `boundedcontext/.../command/`.

---

## CommandHandler

A `CommandHandler<T, R>` processes a single command type `T` and returns `R`. It receives an `EventQueue` so it can publish domain events as side effects.

The `declareEvents()` method is a static declaration (no execution) used by `CommandInvoker` to build a flow map for documentation and observability.

### Kotlin (actual code)

```kotlin
// CommandHandler.kt
interface CommandHandler<T : Any, R> {
    fun handle(eventQueue: EventQueue, command: T): R
    fun declareEvents(): List<Class<*>>
}

// CreateWorkspaceHandler.kt
@Component
class CreateWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<CreateWorkspaceCommand, Workspace> {

    override fun handle(eventQueue: EventQueue, command: CreateWorkspaceCommand): Workspace {
        require(command.name.isNotBlank()) { "Workspace name cannot be blank" }
        val count = workspaceRepository.findAll().size
        val newWorkspace = Workspace(name = Workspace.Name(command.name), ordering = count)
        val persisted = workspaceRepository.save(newWorkspace)
        eventQueue.add(WorkspaceCreatedEvent(persisted.toDTO()))
        return persisted
    }

    override fun declareEvents(): List<Class<*>> = listOf(WorkspaceCreatedEvent::class.java)
}
```

### Java equivalent

```java
// CommandHandler.java
public interface CommandHandler<T, R> {
    R handle(EventQueue eventQueue, T command);
    List<Class<?>> declareEvents();
}

// CreateWorkspaceHandler.java
@Component
public class CreateWorkspaceHandler implements CommandHandler<CreateWorkspaceCommand, Workspace> {

    private final WorkspaceRepository workspaceRepository;

    public CreateWorkspaceHandler(WorkspaceRepository workspaceRepository) {
        this.workspaceRepository = workspaceRepository;
    }

    @Override
    public Workspace handle(EventQueue eventQueue, CreateWorkspaceCommand command) {
        if (command.name().isBlank()) {
            throw new IllegalArgumentException("Workspace name cannot be blank");
        }
        int count = workspaceRepository.findAll().size();
        Workspace newWorkspace = new Workspace(new Workspace.Name(command.name()), count);
        Workspace persisted = workspaceRepository.save(newWorkspace);
        eventQueue.add(new WorkspaceCreatedEvent(persisted.toDTO()));
        return persisted;
    }

    @Override
    public List<Class<?>> declareEvents() {
        return List.of(WorkspaceCreatedEvent.class);
    }
}
```

---

## Query

A `Query` is a **data object** expressing a read intent. Like `Command`, it is parameterised with the return type `R` but never modifies state.

### Kotlin (actual code)

```kotlin
// Query.kt
interface Query<R>

// GetFolderContentByIdQuery.kt
data class GetFolderContentByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>
```

### Java equivalent

```java
// Query.java
public interface Query<R> {}

// GetFolderContentByIdQuery.java
public record GetFolderContentByIdQuery(int folderId) implements Query<ScriptsFolderResponse> {}
```

---

## QueryHandler

A `QueryHandler<Q, R>` handles one query type. It receives **no** `EventQueue` — queries must not produce events or cause side effects.

### Kotlin (actual code)

```kotlin
// QueryHandler.kt
interface QueryHandler<Q : Query<R>, R> {
    fun handle(query: Q): R
}

// GetFolderContentQueryHandler.kt
@Component
class GetFolderContentQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetFolderContentByIdQuery, ScriptsFolderResponse> {

    override fun handle(query: GetFolderContentByIdQuery): ScriptsFolderResponse {
        val folder = folderRepository.findByIdOrNull(query.folderId)
            ?: throw ScriptManagerException("Folder not found with id: ${query.folderId}")
        return folder.toResponse()
    }
}
```

### Java equivalent

```java
// QueryHandler.java
public interface QueryHandler<Q extends Query<R>, R> {
    R handle(Q query);
}

// GetFolderContentQueryHandler.java
@Component
public class GetFolderContentQueryHandler
        implements QueryHandler<GetFolderContentByIdQuery, ScriptsFolderResponse> {

    private final ScriptsFolderRepository folderRepository;

    public GetFolderContentQueryHandler(ScriptsFolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    @Override
    public ScriptsFolderResponse handle(GetFolderContentByIdQuery query) {
        return folderRepository.findById(query.folderId())
            .map(ScriptsFolder::toResponse)
            .orElseThrow(() ->
                new ScriptManagerException("Folder not found with id: " + query.folderId()));
    }
}
```

---

## CommandInvoker

`CommandInvoker` is the **bus** for write operations. It:

- Discovers the correct `CommandHandler` by inspecting generic type parameters at startup (reflection-based handler map)
- Executes the handler inside a transaction (via `PlatformTransactionManager`)
- Dispatches events from the `EventQueue` after the handler completes
- Exposes `getFlow()` to return a static documentation of command → event → policy flows

### Kotlin (actual code)

```kotlin
interface CommandInvoker {
    fun <T : Any, R> invoke(handler: CommandHandler<T, R>, command: T): R
    fun <R> invoke(command: Command<R>): R
    fun getFlow(): FlowResponse
}
```

Usage in a controller:

```kotlin
@RestController
class FolderController(
    private val commandInvoker: CommandInvoker,
    private val queryInvoker: QueryInvoker
) {
    @PostMapping
    fun createFolder(@RequestBody request: CreateFolderRequest): ApiResponse<ScriptsFolderDTO> {
        val command = CreateFolderCommand(name = request.name)
        val result = commandInvoker.invoke(command)
        return ApiResponse(result.toDTO())
    }
}
```

### Java equivalent

```java
// CommandInvoker.java
public interface CommandInvoker {
    <T, R> R invoke(CommandHandler<T, R> handler, T command);
    <R> R invoke(Command<R> command);
    FlowResponse getFlow();
}

// FolderController.java
@RestController
@RequestMapping("/folders")
public class FolderController {

    private final CommandInvoker commandInvoker;
    private final QueryInvoker queryInvoker;

    public FolderController(CommandInvoker commandInvoker, QueryInvoker queryInvoker) {
        this.commandInvoker = commandInvoker;
        this.queryInvoker = queryInvoker;
    }

    @PostMapping
    public ApiResponse<ScriptsFolderDTO> createFolder(@RequestBody CreateFolderRequest request) {
        var command = new CreateFolderCommand(request.name());
        var result = commandInvoker.invoke(command);
        return new ApiResponse<>(result.toDTO());
    }
}
```

### How handler resolution works

At Spring startup, `OneTransactionCommandInvoker` receives all `CommandHandler` beans via constructor injection. For each handler it walks the generic interface list at runtime to extract the concrete command class:

```java
// Simplified Java equivalent of buildHandlerMap()
private Map<Class<?>, CommandHandler<?, ?>> buildHandlerMap(List<CommandHandler<?, ?>> handlers) {
    Map<Class<?>, CommandHandler<?, ?>> map = new HashMap<>();
    for (CommandHandler<?, ?> handler : handlers) {
        for (Type iface : handler.getClass().getGenericInterfaces()) {
            if (iface instanceof ParameterizedType pt
                    && pt.getRawType() == CommandHandler.class) {
                Class<?> commandClass = (Class<?>) pt.getActualTypeArguments()[0];
                map.put(commandClass, handler);
            }
        }
    }
    return map;
}
```

This means **no manual registration is needed** — adding a new `@Component` handler is sufficient.

---

## QueryInvoker

`QueryInvoker` mirrors `CommandInvoker` but for reads. The implementation wraps every call in `@Transactional(readOnly = true)`.

### Kotlin (actual code)

```kotlin
interface QueryInvoker {
    fun <R> invoke(query: Query<R>): R
}
```

Usage in a controller:

```kotlin
@GetMapping("/{id}")
fun getFolderById(@PathVariable id: Int): ApiResponse<ScriptsFolderResponse> {
    val query = GetFolderByIdQuery(folderId = id)
    val folder = queryInvoker.invoke(query)
    return ApiResponse(folder)
}
```

### Java equivalent

```java
// QueryInvoker.java
public interface QueryInvoker {
    <R> R invoke(Query<R> query);
}

// DefaultQueryInvoker.java
@Component
public class DefaultQueryInvoker implements QueryInvoker {

    private final Map<Class<?>, QueryHandler<?, ?>> handlerMap;

    public DefaultQueryInvoker(List<QueryHandler<?, ?>> queryHandlers) {
        this.handlerMap = buildHandlerMap(queryHandlers);
    }

    @Transactional(readOnly = true)
    @Override
    @SuppressWarnings("unchecked")
    public <R> R invoke(Query<R> query) {
        QueryHandler<Query<R>, R> handler =
            (QueryHandler<Query<R>, R>) handlerMap.get(query.getClass());
        if (handler == null) {
            throw new IllegalArgumentException(
                "No handler found for query: " + query.getClass().getSimpleName());
        }
        return handler.handle(query);
    }

    private Map<Class<?>, QueryHandler<?, ?>> buildHandlerMap(List<QueryHandler<?, ?>> handlers) {
        // same reflection technique as CommandInvoker
        Map<Class<?>, QueryHandler<?, ?>> map = new HashMap<>();
        for (QueryHandler<?, ?> handler : handlers) {
            for (Type iface : handler.getClass().getGenericInterfaces()) {
                if (iface instanceof ParameterizedType pt
                        && pt.getRawType() == QueryHandler.class) {
                    map.put((Class<?>) pt.getActualTypeArguments()[0], handler);
                }
            }
        }
        return map;
    }
}
```

---

## Domain Events

Events are **immutable data objects** that describe something that already happened. They are published into Spring's `ApplicationEventPublisher` by the `DomainEventDispatcher` after a `CommandHandler` completes.

### Kotlin (actual code)

```kotlin
// WorkspaceCreatedEvent.kt
data class WorkspaceCreatedEvent(
    val workspace: WorkspaceDTO
)
```

Events do **not** implement any marker interface — they are plain data classes. Any Spring bean can listen to them via `@EventListener`.

### Java equivalent

```java
// WorkspaceCreatedEvent.java
public record WorkspaceCreatedEvent(WorkspaceDTO workspace) {}

// ScriptExecutedEvent.java
public record ScriptExecutedEvent(int scriptId, long executedAt) {}
```

---

## Policy

A `Policy` is a Spring component that **listens to domain events** and may react by issuing new commands. It implements the `Policy` marker interface and uses `@EventListener` on its handler methods.

Policies are the primary mechanism for **cross-aggregate side-effects** and **process automation** in this architecture.

### Kotlin (actual code)

```kotlin
// Policy.kt
interface Policy

// RecordExecutedCommandIntoHistoryPolicy.kt
@Component
class RecordExecutedCommandIntoHistoryPolicy(
    private val commandInvoker: CommandInvoker
) : Policy {

    @EventListener
    @Invariant("Whenever a script is executed, create a history record to capture the event")
    @NextCommand(CreateScriptHistoryCommand::class)
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        val command = CreateScriptHistoryCommand(
            scriptId = event.scriptId,
            time = System.currentTimeMillis()
        )
        commandInvoker.invoke(command)
    }
}
```

### Java equivalent

```java
// Policy.java
public interface Policy {}

// RecordExecutedCommandIntoHistoryPolicy.java
@Component
public class RecordExecutedCommandIntoHistoryPolicy implements Policy {

    private final CommandInvoker commandInvoker;

    public RecordExecutedCommandIntoHistoryPolicy(CommandInvoker commandInvoker) {
        this.commandInvoker = commandInvoker;
    }

    @EventListener
    @Invariant("Whenever a script is executed, create a history record to capture the event")
    @NextCommand(CreateScriptHistoryCommand.class)
    public void onScriptExecuted(ScriptExecutedEvent event) {
        var command = new CreateScriptHistoryCommand(event.scriptId(), System.currentTimeMillis());
        commandInvoker.invoke(command);
    }
}
```

Policies can also be **declarative placeholders** using `ToBeArrangedEvent` when the real event is not yet defined:

```kotlin
// IsEditingFlagPolicy.kt
@Component
class IsEditingFlagPolicy : Policy {

    @EventListener
    @Invariant("When there is any change, is_editing should be true")
    fun `When there is any change, is_editing should be true`(event: ToBeArrangedEvent) {
        // TODO: implement
    }
}
```

This pattern lets you **document business invariants in code** before the implementation is ready.

---

## Annotations: `@NextCommand` and `@Invariant`

These are custom annotations that live on Policy handler methods. They serve documentation and observability purposes — `CommandInvoker.getFlow()` reads them via reflection to build a static flow map.

### Kotlin (actual code)

```kotlin
// PolicyAnnotations.kt
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class NextCommand(val value: KClass<*>)

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class Invariant(vararg val value: String)
```

### Java equivalent

```java
// NextCommand.java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface NextCommand {
    Class<?> value();
}

// Invariant.java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Invariant {
    String[] value();
}
```

Usage together on a policy method:

```java
@EventListener
@Invariant("Whenever a script is executed, create a history record to capture the event")
@NextCommand(CreateScriptHistoryCommand.class)
public void onScriptExecuted(ScriptExecutedEvent event) { ... }
```

- `@Invariant` — describes the **business rule** this reaction enforces (human-readable, used in flow documentation)
- `@NextCommand` — declares the **command class** that will be triggered (machine-readable, used to build the flow graph)

---

## EventQueue and Dispatch Timing

`EventQueue` is passed to every `CommandHandler`. It holds events collected during command execution and supports two dispatch timings:

| Method                               | Timing        | When dispatched                                                                |
| ------------------------------------ | ------------- | ------------------------------------------------------------------------------ |
| `eventQueue.add(event)`              | `IMMEDIATE`   | During the current transaction, before commit                                  |
| `eventQueue.addTransactional(event)` | `POST_COMMIT` | After the transaction commits (via `TransactionSynchronization.afterCommit()`) |

### Kotlin (actual code)

```kotlin
interface EventQueue {
    fun add(event: Any)
    fun addTransactional(event: Any)
    fun addAll(events: List<Any>)
    fun addAllTransactional(events: List<Any>)
    val immediateEvents: List<EventWrapper<Any>>
    val postCommitEvents: List<EventWrapper<Any>>
}
```

### Java equivalent

```java
// EventQueue.java
public interface EventQueue {
    void add(Object event);
    void addTransactional(Object event);
    void addAll(List<?> events);
    void addAllTransactional(List<?> events);
    List<EventWrapper<?>> getImmediateEvents();
    List<EventWrapper<?>> getPostCommitEvents();
}
```

**When to use each timing:**

- `add()` — side effects that **must be atomic** with the main transaction (e.g., audit log, in-memory projection updates)
- `addTransactional()` — side effects that should only run **if the transaction succeeded** (e.g., sending a notification, calling an external API, triggering a cascade command)

---

## DomainEventLogger

`DomainEventLogger` is a Spring component that automatically persists every domain event to an `events` table for audit purposes. It listens to the internal `EventWrapper` published by `DomainEventDispatcher`:

- `@EventListener` with `Propagation.MANDATORY` — joins the current transaction to persist `IMMEDIATE` events
- `@TransactionalEventListener(AFTER_COMMIT)` with `Propagation.REQUIRES_NEW` — opens a new transaction after commit to persist `POST_COMMIT` events

This gives you a **full audit trail** without any changes to command handler code.

### Java equivalent (sketch)

```java
@Component
public class DomainEventLogger {

    private final EventRepository eventRepository;

    // Runs inside the main transaction (for IMMEDIATE events)
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSynchronousEvent(EventWrapper<?> wrapper) {
        if (wrapper.timing() != DispatchTiming.IMMEDIATE) return;
        persistEvent(wrapper);
    }

    // Runs in a new transaction after commit (for POST_COMMIT events)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordTransactionalEvent(EventWrapper<?> wrapper) {
        if (wrapper.timing() != DispatchTiming.POST_COMMIT) return;
        persistEvent(wrapper);
    }
}
```

---

## Full Flow Walkthrough

Below is a complete end-to-end example — executing a script and automatically recording its history.

```
POST /scripts/{id}/execute
         │
         ▼
   ScriptController
         │
         │  commandInvoker.invoke(ExecuteScriptCommand(id))
         ▼
   OneTransactionCommandInvoker
   ┌─────────────────────────────────────┐
   │  Transaction starts                  │
   │                                      │
   │  ExecuteScriptHandler.handle(...)    │
   │    → runs the script                 │
   │    → eventQueue.add(                 │
   │        ScriptExecutedEvent(id))      │
   │                                      │
   │  DomainEventDispatcher.dispatch()   │
   │    → publishes EventWrapper (audit) │
   │    → publishes ScriptExecutedEvent  │
   │                                      │
   │  Transaction commits                 │
   └─────────────────────────────────────┘
         │
         │  Spring fires @EventListener
         ▼
   RecordExecutedCommandIntoHistoryPolicy
   .onScriptExecuted(ScriptExecutedEvent)
         │
         │  commandInvoker.invoke(
         │      CreateScriptHistoryCommand(scriptId, time))
         ▼
   CreateScriptHistoryHandler.handle(...)
         │
         ▼
   History record persisted
```

### Java code for the full chain

```java
// 1. Command
public record ExecuteScriptCommand(int scriptId) implements Command<Void> {}

// 2. CommandHandler
@Component
public class ExecuteScriptHandler implements CommandHandler<ExecuteScriptCommand, Void> {

    private final ScriptRepository scriptRepository;
    private final ScriptExecutor executor;

    @Override
    public Void handle(EventQueue eventQueue, ExecuteScriptCommand command) {
        Script script = scriptRepository.findById(command.scriptId()).orElseThrow();
        executor.run(script);
        eventQueue.add(new ScriptExecutedEvent(command.scriptId()));
        return null;
    }

    @Override
    public List<Class<?>> declareEvents() {
        return List.of(ScriptExecutedEvent.class);
    }
}

// 3. Domain Event
public record ScriptExecutedEvent(int scriptId) {}

// 4. Policy reacting to the event
@Component
public class RecordExecutedCommandIntoHistoryPolicy implements Policy {

    private final CommandInvoker commandInvoker;

    @EventListener
    @Invariant("Whenever a script is executed, create a history record")
    @NextCommand(CreateScriptHistoryCommand.class)
    public void onScriptExecuted(ScriptExecutedEvent event) {
        commandInvoker.invoke(
            new CreateScriptHistoryCommand(event.scriptId(), System.currentTimeMillis()));
    }
}

// 5. Controller wiring it all together
@RestController
@RequestMapping("/scripts")
public class ScriptController {

    private final CommandInvoker commandInvoker;
    private final QueryInvoker queryInvoker;

    @PostMapping("/{id}/execute")
    public ResponseEntity<Void> execute(@PathVariable int id) {
        commandInvoker.invoke(new ExecuteScriptCommand(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ApiResponse<ScriptResponse> getScript(@PathVariable int id) {
        return new ApiResponse<>(queryInvoker.invoke(new GetScriptByIdQuery(id)));
    }
}
```

---

## Summary Table

| Concept               | Role                                           | Side Effects             | Transaction                           |
| --------------------- | ---------------------------------------------- | ------------------------ | ------------------------------------- |
| `Command<R>`          | Expresses write intent                         | None (data only)         | —                                     |
| `CommandHandler<T,R>` | Executes a command, publishes events           | Via `EventQueue`         | Participates in invoker's transaction |
| `Query<R>`            | Expresses read intent                          | None (data only)         | —                                     |
| `QueryHandler<Q,R>`   | Answers a query                                | None allowed             | Read-only                             |
| `CommandInvoker`      | Routes commands, manages transactions & events | Dispatches events        | Opens transaction                     |
| `QueryInvoker`        | Routes queries                                 | None                     | Read-only transaction                 |
| Domain Event          | Describes what happened                        | None (data only)         | Published post-handle                 |
| `Policy`              | Reacts to events, chains commands              | Via `CommandInvoker`     | New transaction per command           |
| `@Invariant`          | Documents business rule                        | None                     | —                                     |
| `@NextCommand`        | Declares the next command class                | None                     | —                                     |
| `EventQueue`          | Collects events during handler execution       | IMMEDIATE or POST_COMMIT | —                                     |
| `DomainEventLogger`   | Persists all events for audit                  | Writes to `events` table | Mandatory / REQUIRES_NEW              |
