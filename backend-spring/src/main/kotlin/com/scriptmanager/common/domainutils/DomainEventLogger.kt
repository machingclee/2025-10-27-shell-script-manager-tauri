package com.scriptmanager.common.domainutils

import com.scriptmanager.common.entity.Event
import com.scriptmanager.common.utils.JsonNodeUtil
import com.scriptmanager.repository.EventRepository

import org.slf4j.MDC
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener
import java.util.*


@Component
class DomainEventLogger(
    private val eventRepository: EventRepository,
    private val applicationEventPublisher: ApplicationEventPublisher,
) {
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)  // Join existing transaction
    fun recordSynchronousEvent(wrapperEvent: EventWrapper<Any>) {
        if (wrapperEvent.timing != DispatchTiming.IMMEDIATE) {
            return
        }

        try {
            // Immediate event audit with precise timing
            // This runs in the SAME transaction as the command
            persistEventWithPreciseTiming(wrapperEvent)
        } catch (e: Exception) {
            // Log audit failure but don't break the flow
            println("Warning: Failed to persist synchronous event: ${e.message}")
            e.printStackTrace()
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun recordTransactionalEvent(wrapperEvent: EventWrapper<Any>) {
        if (wrapperEvent.timing != DispatchTiming.POST_COMMIT) {
            return
        }
        try {
            // For post-commit events, persist with precise timing
            persistEventWithPreciseTiming(wrapperEvent)
            applicationEventPublisher.publishEvent(wrapperEvent.event)
        } catch (e: Exception) {
            // Log the error but don't let event logging failures break the application
            println("Warning: Failed to persist or publish transactional event: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun persistEventWithPreciseTiming(wrappedEvent: EventWrapper<Any>) {
        val event = wrappedEvent.event
        val ctx = wrappedEvent.context
        val requestID = try {
            UUID.fromString(MDC.get("requestId") ?: ctx?.requestId).toString()
        } catch (e: Exception) {
            ""
        }

        val userEmail = "me"

        // Detect which command dispatched this event
        val eventTypeName = event::class.simpleName ?: ""
        val commandAwareEventType = if (ctx?.commandName != null) {
            "${ctx.commandName} > $eventTypeName"
        } else {
            detectCommandOrigin(eventTypeName)
        }

        // Get unique timestamp in milliseconds (no decimals)
        val baseTimestamp = System.currentTimeMillis()
        val nanoOffset = (System.nanoTime()%1000).toInt()  // Use last 3 digits of nanos for uniqueness
        val uniqueTimestamp = baseTimestamp + nanoOffset

        val eventJsonNode = JsonNodeUtil.toJsonNode(event)
        val eventToSave = Event(
            createdAt = uniqueTimestamp.toDouble(),  // Convert to Double for database
            eventType = commandAwareEventType,
            payload = eventJsonNode.toString(),
            requestUserEmail = userEmail,
            requestId = requestID
        )

        // Save immediately with precise timing
        eventRepository.save(eventToSave)
        println("AUDIT: Event saved immediately with createdAt = $uniqueTimestamp")
    }

    private fun persistEvent(wrappedEvent: EventWrapper<Any>) {
        val event = wrappedEvent.event
        val ctx = wrappedEvent.context
        val requestID = try {
            UUID.fromString(MDC.get("requestId") ?: ctx?.requestId).toString()
        } catch (e: Exception) {
            ""
        }

        // MDC.set("userEmail") has been executed when we call the command
        // this event may be handled by another thread when it is transactional event listener
        val userEmail = "me"

        // Detect which command dispatched this event
        val eventTypeName = event::class.simpleName ?: ""
        val commandAwareEventType = if (ctx?.commandName != null) {
            "${ctx.commandName} > $eventTypeName"
        } else {
            detectCommandOrigin(eventTypeName)
        }

        val eventJsonNode = JsonNodeUtil.toJsonNode(event).toString()
        val eventToStore = Event(
            eventType = commandAwareEventType,
            payload = eventJsonNode,
            requestUserEmail = userEmail,
            requestId = requestID
        )
        eventRepository.save(eventToStore)
    }

    private fun detectCommandOrigin(eventTypeName: String): String {
        return try {
            // Get the current stack trace
            val stackTrace = Thread.currentThread().stackTrace

            // Look for command handler classes in the stack trace
            for (stackElement in stackTrace) {
                val className = stackElement.className

                // Look for the specific command handler package structure
                if (className.contains("dev.james.alicetimetable.boundedcontext.context.timetable.commandHandler") &&
                    className.endsWith("Handler")
                ) {
                    // Extract the command name from handler name
                    // e.g., "MoveClassHandler" -> "MoveClassCommand"
                    val handlerName = className.substringAfterLast(".")
                    val commandName = handlerName.replace("Handler", "Command")
                    return "$commandName > $eventTypeName"
                }

                // Also look for user context command handlers
                if (className.contains("dev.james.alicetimetable.boundedcontext.context.user.commandHandler") &&
                    className.endsWith("Handler")
                ) {
                    val handlerName = className.substringAfterLast(".")
                    val commandName = handlerName.replace("Handler", "Command")
                    return "$commandName > $eventTypeName"
                }

                // Also look for notification context command handlers
                if (className.contains("dev.james.alicetimetable.boundedcontext.context.notification.commandHandler") &&
                    className.endsWith("Handler")
                ) {
                    val handlerName = className.substringAfterLast(".")
                    val commandName = handlerName.replace("Handler", "Command")
                    return "$commandName > $eventTypeName"
                }
            }

            // If no command handler found, return just the event name
            eventTypeName
        } catch (e: Exception) {
            // If anything goes wrong, just return the event name
            eventTypeName
        }
    }

}
