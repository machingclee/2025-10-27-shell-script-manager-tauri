package com.scriptmanager.common.domainutils

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.scriptmanager.common.entity.Event
import com.scriptmanager.common.utils.JsonNodeUtil
import com.scriptmanager.repository.EventRepository
import jakarta.persistence.EntityManager
import org.slf4j.MDC
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.transaction.support.TransactionTemplate
import java.util.UUID

// Event timing enum (internal use only)
enum class DispatchTiming {
    IMMEDIATE,
    POST_COMMIT
}

// Event wrapper to hold timing information (internal use only)
data class EventWrapper<T : Any>(
    val event: T,
    val timing: DispatchTiming,
    var context: ExecutionContext? = null,
)

// Simplified EventQueue interface
interface EventQueue {
    fun add(event: Any)
    fun addTransactional(event: Any)

    // Bulk operations
    fun addAll(events: List<Any>)
    fun addAllTransactional(events: List<Any>)

    val immediateEvents: List<EventWrapper<Any>>
    val postCommitEvents: List<EventWrapper<Any>>
    val allEvents: List<EventWrapper<Any>>

    // Keep backward compatibility
    val events: List<EventWrapper<Any>>
        get() = immediateEvents + postCommitEvents
}

// Updated EventQueue implementation
class SmartEventQueue : EventQueue {
    private val _events = mutableListOf<EventWrapper<Any>>()

    override fun add(event: Any) {
        val context = captureCurrentCommandContext()
        _events.add(EventWrapper(event, DispatchTiming.IMMEDIATE, context))
    }

    override fun addTransactional(event: Any) {
        val context = captureCurrentCommandContext()
        _events.add(EventWrapper(event, DispatchTiming.POST_COMMIT, context))
    }

    override fun addAll(events: List<Any>) {
        val context = captureCurrentCommandContext()
        events.forEach { event ->
            _events.add(EventWrapper(event, DispatchTiming.IMMEDIATE, context))
        }
    }

    override fun addAllTransactional(events: List<Any>) {
        val context = captureCurrentCommandContext()
        events.forEach { event ->
            _events.add(EventWrapper(event, DispatchTiming.POST_COMMIT, context))
        }
    }

    private fun captureCurrentCommandContext(): ExecutionContext {
        var commandName: String? = null

        return ExecutionContext(
            userEmail = "me",
            requestId = MDC.get("requestId"),
            originalMDC = MDC.getCopyOfContextMap(),
            commandName = commandName
        )
    }

    override val immediateEvents: List<EventWrapper<Any>>
        get() = _events.filter { it.timing == DispatchTiming.IMMEDIATE }

    override val postCommitEvents: List<EventWrapper<Any>>
        get() = _events.filter { it.timing == DispatchTiming.POST_COMMIT }

    override val allEvents: List<EventWrapper<Any>>
        get() = _events.toList()
}

// Updated DomainEventDispatcher
interface DomainEventDispatcher {
    fun dispatchNow(eventQueue: EventQueue, requestId: String? = null)
    fun dispatch(eventQueue: EventQueue, requestId: String? = null)
}

@Component
class SpringDomainEventDispatcher(
    private val applicationEventPublisher: ApplicationEventPublisher,
) : DomainEventDispatcher {

    override fun dispatchNow(eventQueue: EventQueue, requestId: String?) {
        // Keep backward compatibility - dispatch all events immediately
        dispatchEvents(eventQueue.events, requestId)
    }

    override fun dispatch(eventQueue: EventQueue, requestId: String?) {
        // New method that respects timing
        // Dispatch immediate events right away
        dispatchEvents(eventQueue.immediateEvents, requestId)

        // Register post-commit events for later dispatch
        if (eventQueue.postCommitEvents.isNotEmpty()) {
            registerPostCommitEvents(eventQueue.postCommitEvents, requestId)
        }
    }

    private fun dispatchEvents(wrappedEvents: List<EventWrapper<Any>>, requestId: String?) {
        // Don't modify MDC here - preserve existing context for policy handlers
        // The requestId should already be set by the CommandInvoker
        wrappedEvents.forEach { wrappedEvent ->
            // First publish the wrapper for audit logging (separate transaction)
            applicationEventPublisher.publishEvent(wrappedEvent)

            // Then publish the actual business event (same transaction)
            // This ensures business side effects are atomic with main transaction
            applicationEventPublisher.publishEvent(wrappedEvent.event)
        }
    }

    private fun registerPostCommitEvents(wrapperEvents: List<EventWrapper<Any>>, requestId: String?) {
        val capturedContext = captureCurrentContext(requestId)

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                object : TransactionSynchronization {
                    override fun afterCommit() {
                        withContext(capturedContext) { ctx ->
                            wrapperEvents.forEach { wrappedEvent ->
                                wrappedEvent.context = ctx
                                // Publish both wrapper (for audit) and event (for business logic)
                                applicationEventPublisher.publishEvent(wrappedEvent)
                                applicationEventPublisher.publishEvent(wrappedEvent.event)
                            }
                        }
                    }
                }
            )
        } else {
            // If no transaction is active, dispatch immediately
            dispatchEvents(wrapperEvents, requestId)
        }
    }

    private fun captureCurrentContext(requestId: String?): ExecutionContext {
        val user = "me"
        return ExecutionContext(
            userEmail = "me",
            requestId = requestId,
            originalMDC = MDC.getCopyOfContextMap()
        )
    }

    private fun withContext(context: ExecutionContext, block: (context: ExecutionContext) -> Unit) {
        // Set up context for event handlers
        context.userEmail?.let { MDC.put("userEmail", it) }
        context.requestId?.let { MDC.put("requestId", it) }
        context.originalMDC?.forEach { (key, value) -> MDC.put(key, value) }

        // Temporarily set user in ThreadLocal if your AuthAspect supports it
        // This depends on how AuthAspect stores the current user

        try {
            block(context)
        } finally {
            MDC.clear()
        }
    }
}

data class ExecutionContext(
    val userEmail: String?,
    val requestId: String?,
    val originalMDC: Map<String, String>?,
    val commandName: String? = null,
)

data class CommandEventFlow(
    val from: String,
    val to: List<String>
)

data class PolicyCommandFlow(
    val policy: String,
    val fromEvent: String,
    val toCommand: String
)

data class FlowResponse(
    val commandEvents: List<CommandEventFlow>,
    val policyCommands: List<PolicyCommandFlow>
)

interface CommandInvoker {
    fun <T : Any, R> invoke(handler: CommandHandler<T, R>, command: T): R
    fun <R> invoke(command: Command<R>): R
    fun getFlow(): FlowResponse
}

@Component
class OneTransactionCommandInvoker(
    private val transactionManager: PlatformTransactionManager,
    private val domainEventDispatcher: DomainEventDispatcher,
    private val commandAuditor: CommandAuditor,
    private val eventRepository: EventRepository,
    private val commandHandlers: List<CommandHandler<*, *>>,
    @org.springframework.context.annotation.Lazy private val policies: List<Policy>
) : CommandInvoker {
    private val transactionTemplate: TransactionTemplate = TransactionTemplate(transactionManager)

    private val _commandEventFlow = mutableListOf<CommandEventFlow>()
    private val _policyCommandFlow = mutableListOf<PolicyCommandFlow>()

    /**
     * Map of command class to its handler for fast lookup
     * Lazy initialization to avoid circular dependency issues
     */
    private val handlerMap: Map<Class<*>, CommandHandler<*, *>> by lazy { buildHandlerMap() }

    override fun getFlow(): FlowResponse {
        // Force initialization of handlerMap if not already initialized
        // This ensures buildHandlerMap() has been called
        handlerMap.size // Access handlerMap to trigger lazy initialization

        return FlowResponse(
            commandEvents = _commandEventFlow.toList(),
            policyCommands = _policyCommandFlow.toList()
        )
    }

    private fun buildHandlerMap(): Map<Class<*>, CommandHandler<*, *>> {
        val map = mutableMapOf<Class<*>, CommandHandler<*, *>>()

        commandHandlers.forEach { handler ->
            val commandClass = extractCommandClass(handler)
            if (commandClass != null) {
                if (map.containsKey(commandClass)) {
                    throw IllegalStateException(
                        "Multiple handlers found for command: ${commandClass.simpleName}"
                    )
                }
                map[commandClass] = handler
                println("Registered command handler: ${handler::class.simpleName} for ${commandClass.simpleName}")

                // Build flow mapping from declared events
                val declaredEvents = try {
                    handler.declareEvents()
                } catch (e: Exception) {
                    println("Warning: Failed to get declared events from ${handler::class.simpleName}: ${e.message}")
                    emptyList()
                }

                if (declaredEvents.isNotEmpty()) {
                    val eventNames = declaredEvents.map { it.simpleName }
                    _commandEventFlow.add(CommandEventFlow(from = commandClass.simpleName, to = eventNames))
                    println("Flow declared: ${commandClass.simpleName} -> [${eventNames.joinToString(", ")}]")
                }
            }
        }

        // Build policy-command flow from policy declarations
        buildPolicyFlows()

        return map
    }

    private fun buildPolicyFlows() {
        policies.forEach { policy ->
            val policyName = policy::class.java.simpleName
            try {
                val flows = policy.declareflows()
                flows.forEach { flow ->
                    val policyCommandFlow = PolicyCommandFlow(
                        policy = policyName,
                        fromEvent = flow.fromEvent.simpleName,
                        toCommand = flow.toCommand.simpleName
                    )
                    _policyCommandFlow.add(policyCommandFlow)
                    println("Policy flow: ${flow.fromEvent.simpleName} -> $policyName -> ${flow.toCommand.simpleName}")
                }
            } catch (e: Exception) {
                println("Warning: Failed to get declared flows from $policyName: ${e.message}")
            }
        }
    }

    private fun extractCommandClass(handler: CommandHandler<*, *>): Class<*>? {
        val handlerClass = handler::class.java
        val genericInterfaces = handlerClass.genericInterfaces

        for (genericInterface in genericInterfaces) {
            if (genericInterface is java.lang.reflect.ParameterizedType) {
                val rawType = genericInterface.rawType
                if (rawType == CommandHandler::class.java) {
                    val typeArgs = genericInterface.actualTypeArguments
                    if (typeArgs.isNotEmpty()) {
                        return typeArgs[0] as? Class<*>
                    }
                }
            }
        }
        return null
    }

    @Suppress("UNCHECKED_CAST")
    override fun <R> invoke(command: Command<R>): R {
        val handler = handlerMap[command::class.java]
            ?: throw IllegalArgumentException(
                "No handler registered for command: ${command::class.simpleName}"
            )

        return invoke(handler as CommandHandler<Any, R>, command as Any)
    }

    override fun <T : Any, R> invoke(handler: CommandHandler<T, R>, command: T): R {

        // Preserve existing requestId for nested commands, or create new one for top-level commands
        val existingRequestId = MDC.get("requestId")
        val requestId = existingRequestId ?: UUID.randomUUID().toString()
        val isNestedCommand = existingRequestId != null

        // Always ensure MDC has the requestId
        MDC.put("requestId", requestId)
        MDC.put("userEmail", "me")
        var commandEventId: Int? = null
        var dispatchedEvents: List<EventWrapper<Any>> = emptyList()

        // Debug logging
        println("Command: ${command.javaClass.simpleName}, isNested: $isNestedCommand, requestId: $requestId")

        try {
            // Execute all commands the same way - use existing transaction if available, otherwise create new one
            val result = if (isNestedCommand && TransactionSynchronizationManager.isSynchronizationActive()) {
                // Execute directly in existing transaction for nested commands
                println("Executing nested command in existing transaction")
                val eventQueue = SmartEventQueue()

                // Log command audit INSIDE the transaction
                val commandEvent = commandAuditor.logCommandInTransaction(command, requestId)
                commandEventId = commandEvent.id

                val result = handler.handle(eventQueue, command)
                dispatchedEvents = eventQueue.allEvents
                domainEventDispatcher.dispatch(eventQueue, requestId)

                // Mark as success immediately (same transaction)
                commandEvent.success = true
                eventRepository.save(commandEvent)

                result
            } else {
                // Create new transaction for top-level commands
                println("Executing top-level command in new transaction")
                var tempDispatchedEvents: List<EventWrapper<Any>> = emptyList()
                val result = transactionTemplate.execute { _ ->
                    val eventQueue = SmartEventQueue()

                    // Log command audit INSIDE the transaction
                    val commandEvent = commandAuditor.logCommandInTransaction(command, requestId)
                    commandEventId = commandEvent.id

                    val result = handler.handle(eventQueue, command)
                    tempDispatchedEvents = eventQueue.allEvents
                    domainEventDispatcher.dispatch(eventQueue, requestId)

                    // Mark as success immediately (same transaction)
                    commandEvent.success = true
                    eventRepository.save(commandEvent)

                    result
                } ?: throw IllegalStateException()
                dispatchedEvents = tempDispatchedEvents
                result
            }

            println("Command completed successfully: ${command.javaClass.simpleName}")
            return result
        } catch (e: Exception) {
            println("Command failed: ${command.javaClass.simpleName}, error: ${e.message}")
            e.printStackTrace()

            // Note: Command audit was rolled back with the transaction
            // We cannot log the failure because the command event was not persisted
            println("Warning: Command audit was rolled back due to transaction failure")

            throw e
        } finally {
            // Only clear MDC for top-level commands to preserve context for nested commands
            if (!isNestedCommand) {
                MDC.clear()
            }
        }
    }
}

@Component
class CommandAuditor(
    private val eventRepository: EventRepository,
    private val entityManager: EntityManager,
) {
    private val objectMapper = ObjectMapper().apply {
        registerModule(KotlinModule.Builder().build())
        configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
    }

    @Transactional(propagation = Propagation.MANDATORY)
    fun <T : Any> logCommandInTransaction(command: T, requestId: String): Event {
        try {
            val eventJsonNode = JsonNodeUtil.toJsonNode(command).toString()
            val userEmail = "me"

            // Detect if this command is being called from a policy
            val commandEventType = detectPolicyOrigin(command.javaClass.simpleName)

            // Get unique timestamp in milliseconds (no decimals)
            val baseTimestamp = System.currentTimeMillis()
            val nanoOffset = (System.nanoTime()%1000).toInt()  // Use last 3 digits of nanos for uniqueness
            val uniqueTimestamp = baseTimestamp + nanoOffset

            val eventToSave = Event(
                createdAt = uniqueTimestamp.toDouble(),  // Convert to Double for database
                requestId = requestId,
                eventType = commandEventType,
                payload = eventJsonNode,
                requestUserEmail = userEmail,
                success = false  // Will be updated to true if command succeeds
            )

            val savedEvent = eventRepository.save(eventToSave)
            println("AUDIT: Command logged in transaction with createdAt = $uniqueTimestamp")
            return savedEvent
        } catch (e: Exception) {
            println("AUDIT ERROR: Failed to save command: ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun <T : Any> logCommandWithPreciseTiming(command: T, requestId: String): Event {
        try {
            val eventJsonNode = JsonNodeUtil.toJsonNode(command).toString()
            val user = "me"
            val userEmail = "me" ?: ""

            // Detect if this command is being called from a policy
            val commandEventType = detectPolicyOrigin(command.javaClass.simpleName)

            // Get unique timestamp in milliseconds (no decimals)
            val baseTimestamp = System.currentTimeMillis()
            val nanoOffset = (System.nanoTime()%1000).toInt()  // Use last 3 digits of nanos for uniqueness
            val uniqueTimestamp = baseTimestamp + nanoOffset

            val eventToSave = Event(
                createdAt = uniqueTimestamp.toDouble(),  // Convert to Double for database
                requestId = requestId,
                eventType = commandEventType,
                payload = eventJsonNode,
                requestUserEmail = userEmail
            )

            val savedEvent = eventRepository.save(eventToSave)
            entityManager.flush() // Force immediate write

            println("AUDIT: Command saved immediately with createdAt = $uniqueTimestamp")
            return savedEvent
        } catch (e: Exception) {
            println("AUDIT ERROR: Failed to save command: ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun <T : Any> logCommand(command: T, requestId: String): Event {
        try {
            val eventJsonNode = JsonNodeUtil.toJsonNode(command).toString()
            val user = "me"
            val userEmail = "me" ?: ""
            MDC.put("userEmail", userEmail)

            // Detect if this command is being called from a policy
            val commandEventType = detectPolicyOrigin(command.javaClass.simpleName)

            val eventToSave = Event(
                requestId = requestId,
                eventType = commandEventType,
                payload = eventJsonNode,
                requestUserEmail = userEmail
            )

            val savedEvent = eventRepository.save(eventToSave)

            // Force flush to ensure the data is actually written to database
            entityManager.flush()

            println("AUDIT: Command saved to database with ID: ${savedEvent.id}")
            return savedEvent
        } catch (e: Exception) {
            println("AUDIT ERROR: Failed to save command to database: ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    fun logSuccess(eventId: Int) {
        val command = eventRepository.findByIdOrNull(eventId) ?: return
        command.success = true
        eventRepository.save(command)
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun logFailure(commandEventId: Int, error: String) {
        val command = eventRepository.findByIdOrNull(commandEventId) ?: return
        command.success = false
        command.failureReason = error
        eventRepository.save(command)
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun logEventFailures(dispatchedEvents: List<EventWrapper<Any>>, requestId: String, failureMessage: String) {
        try {
            val requestUuid = requestId

            // Find all events for this request that were dispatched
            dispatchedEvents.forEach { eventWrapper ->
                val eventTypeName = eventWrapper.event.javaClass.simpleName

                // Find events in database that match this event type and request ID
                // We need to find events that were logged for this specific event
                val eventsToUpdate = findEventsByTypeAndRequest(eventTypeName, requestUuid)

                eventsToUpdate.forEach { event ->
                    event.success = false
                    event.failureReason = failureMessage
                    // Update the event type to indicate failure
                    if (!event.eventType.endsWith("-- Failed!")) {
                        event.eventType = "${event.eventType} -- Failed!"
                    }
                    eventRepository.save(event)
                    println("Updated event ${event.eventType} (ID: ${event.id}) with failure reason")
                }
            }

            entityManager.flush()
            println("Successfully updated all dispatched events with failure reasons")
        } catch (e: Exception) {
            println("Error updating events with failure: ${e.message}")
            e.printStackTrace()
            throw e
        }
    }

    private fun findEventsByTypeAndRequest(eventType: String, requestId: String): List<Event> {
        return try {
            // Find events that match both the event type and request ID
            val matchingEvents = eventRepository.findAllByRequestIdAndEventType(requestId, eventType)
            println("Found ${matchingEvents.size} events of type $eventType for request $requestId")
            matchingEvents
        } catch (e: Exception) {
            println("Could not find events for type $eventType and request $requestId: ${e.message}")
            emptyList()
        }
    }

    private fun detectPolicyOrigin(commandName: String): String {
        return try {
            // Get the current stack trace
            val stackTrace = Thread.currentThread().stackTrace

            // Look for policy classes in the stack trace
            var policyName: String? = null
            var eventMethodName: String? = null

            for (stackElement in stackTrace) {
                val className = stackElement.className
                val methodName = stackElement.methodName

                if (className.contains(".policy.") && className.endsWith("Policy")) {
                    // Extract just the policy class name (without package)
                    policyName = className.substringAfterLast(".")
                    eventMethodName = methodName
                    break
                }
            }

            if (policyName != null) {
                // Try to derive the event name from the method name
                val eventName = deriveEventNameFromMethod(eventMethodName)
                return if (eventName != null) {
                    "$eventName > $policyName > $commandName"
                } else {
                    "$policyName > $commandName"
                }
            }

            // If no policy found, return just the command name
            commandName
        } catch (e: Exception) {
            // If anything goes wrong, just return the command name
            println("Warning: Failed to detect policy origin: ${e.message}")
            commandName
        }
    }

    private fun deriveEventNameFromMethod(methodName: String?): String? {
        return try {
            if (methodName == null) return null

            // Common patterns in policy method names:
            // - resetClassNumbersOn(event) -> event type in parameter
            // - extendClassesOnClassMoved -> ClassMovedEvent
            // - extendClassesOnClassesCreated -> ClassesCreatedEvent

            when {
                methodName.contains("On") -> {
                    // Extract the part after "On" and convert to event name
                    val eventPart = methodName.substringAfterLast("On")
                    if (eventPart.isNotEmpty()) {
                        // Convert camelCase to EventName (e.g., "classMoved" -> "ClassMovedEvent")
                        val eventName = eventPart.replaceFirstChar { it.uppercase() }
                        if (!eventName.endsWith("Event")) {
                            "${eventName}Event"
                        } else {
                            eventName
                        }
                    } else null
                }

                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }
}