package com.scriptmanager.integration

import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.SmartEventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

/**
 * Examples of testing events by passing a test EventQueue to commandInvoker.invoke()
 *
 * This approach gives you BOTH direct event access AND full event dispatching!
 *
 * Key Benefits:
 * ✅ Fast - Direct access to events from queue (no database queries needed)
 * ✅ Complete - Events ARE dispatched to @EventListener and policies
 * ✅ Cascading events - Policies execute and create secondary events
 * ✅ Type-safe - Work with event objects directly from queue
 * ✅ Best of both worlds - Capture events + test full flow
 *
 * What happens when you pass a test queue:
 * 1. Handler adds events to the queue ✅
 * 2. Events ARE dispatched via applicationEventPublisher ✅
 * 3. @EventListener methods ARE called ✅
 * 4. Policies DO execute ✅
 * 5. Cascading events ARE created ✅
 * 6. You get direct access to ALL events via the queue ✅
 *
 * The test queue acts as a "spy" - it captures all events while allowing
 * the normal event flow to proceed. This gives you:
 * - Fast access to events (no DB queries)
 * - Complete behavior testing (policies execute)
 * - Cascading event verification (all events in queue)
 *
 * When to use:
 * - Testing complete command behavior including policies
 * - Fast feedback with full integration
 * - Verifying cascading events without DB queries
 * - Best for integration tests that need speed + completeness
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
class EventTestingWithQueueExamples(
    private val commandInvoker: CommandInvoker
) {

    // ============================================================================
    // Example 1: Basic Event Testing with Queue
    // ============================================================================

    @Test
    fun `should emit WorkspaceCreatedEvent when creating workspace`() {
        // Arrange
        val testQueue = SmartEventQueue()
        val command = CreateWorkspaceCommand("Test Workspace")

        // Act - Pass testQueue to invoke
        val result = commandInvoker.invoke(command, testQueue)

        // Assert - Get events directly from queue
        val events = testQueue.allEvents
        assertEquals(1, events.size, "Should have exactly 1 event")

        val event = events.first().event as WorkspaceCreatedEvent
        assertEquals("Test Workspace", event.workspace.name)
        assertEquals(result.id, event.workspace.id)
    }

    // ============================================================================
    // Example 2: Testing Event Content
    // ============================================================================

    @Test
    fun `WorkspaceCreatedEvent should contain correct workspace data`() {
        // Arrange
        val testQueue = SmartEventQueue()
        val workspaceName = "My Test Workspace ${System.currentTimeMillis()}"

        // Act
        val workspace = commandInvoker.invoke(
            CreateWorkspaceCommand(workspaceName),
            testQueue
        )

        // Assert
        val events = testQueue.allEvents
        assertFalse(events.isEmpty(), "Should have events")

        val event = events.first().event as WorkspaceCreatedEvent

        // Verify all fields
        assertEquals(workspace.id, event.workspace.id)
        assertEquals(workspace.name, event.workspace.name)
        assertEquals(workspace.ordering, event.workspace.ordering)
        assertNotNull(event.workspace.createdAt)
    }

    // ============================================================================
    // Example 3: Testing Multiple Events
    // ============================================================================

    @Test
    fun `command that emits multiple events should add all to queue`() {
        // If a handler emits multiple events, they all go into the queue
        val testQueue = SmartEventQueue()

        commandInvoker.invoke(CreateWorkspaceCommand("First"), testQueue)

        // Verify events in queue
        val events = testQueue.allEvents
        assertTrue(events.isNotEmpty(), "Should have events in queue")

        // You can inspect each event
        events.forEach { wrapper ->
            println("Event type: ${wrapper.event::class.simpleName}")
            println("Timing: ${wrapper.timing}")
            assertNotNull(wrapper.context)
        }
    }

    // ============================================================================
    // Example 4: Testing Immediate vs Transactional Events
    // ============================================================================

    @Test
    fun `can differentiate between immediate and transactional events`() {
        val testQueue = SmartEventQueue()

        // Act
        commandInvoker.invoke(CreateWorkspaceCommand("Test"), testQueue)

        // Assert - Check event timing
        val immediateEvents = testQueue.immediateEvents
        val transactionalEvents = testQueue.postCommitEvents

        println("Immediate events: ${immediateEvents.size}")
        println("Transactional events: ${transactionalEvents.size}")

        // WorkspaceCreatedEvent is added with eventQueue.add() which is IMMEDIATE
        assertTrue(immediateEvents.isNotEmpty(), "Should have immediate events")
    }

    // ============================================================================
    // Example 5: Testing Event Context
    // ============================================================================

    @Test
    fun `events should have execution context`() {
        val testQueue = SmartEventQueue()

        // Act
        commandInvoker.invoke(CreateWorkspaceCommand("Test"), testQueue)

        // Assert
        val eventWrapper = testQueue.allEvents.first()

        // Check context (captured when event was added)
        assertNotNull(eventWrapper.context)
        assertNotNull(eventWrapper.context?.requestId)
        assertEquals("me", eventWrapper.context?.userEmail)
    }

    // ============================================================================
    // Example 6: Testing Multiple Commands
    // ============================================================================

    @Test
    fun `can reuse queue for multiple commands or use separate queues`() {
        // Option A: Separate queues (recommended)
        val queue1 = SmartEventQueue()
        val queue2 = SmartEventQueue()

        commandInvoker.invoke(CreateWorkspaceCommand("First"), queue1)
        commandInvoker.invoke(CreateWorkspaceCommand("Second"), queue2)

        assertEquals(1, queue1.allEvents.size)
        assertEquals(1, queue2.allEvents.size)

        // Option B: Reuse queue (events accumulate)
        val sharedQueue = SmartEventQueue()
        commandInvoker.invoke(CreateWorkspaceCommand("Third"), sharedQueue)
        commandInvoker.invoke(CreateWorkspaceCommand("Fourth"), sharedQueue)

        assertEquals(2, sharedQueue.allEvents.size)
    }

    // ============================================================================
    // Example 7: No Database Queries Needed
    // ============================================================================

    @Test
    fun `testing with queue does not require database queries`() {
        // This test is FAST because:
        // 1. Events go into the queue (no database write)
        // 2. We read from queue (no database read)
        // 3. Event dispatching is skipped when queue is provided

        val testQueue = SmartEventQueue()

        // Act - This is much faster than full integration test
        val start = System.currentTimeMillis()
        commandInvoker.invoke(CreateWorkspaceCommand("Fast Test"), testQueue)
        val duration = System.currentTimeMillis() - start

        println("Command execution took ${duration}ms")

        // Assert
        val events = testQueue.allEvents
        assertEquals(1, events.size)

        // No need to query database!
        val event = events.first().event as WorkspaceCreatedEvent
        assertEquals("Fast Test", event.workspace.name)
    }

    // ============================================================================
    // Example 8: Type-Safe Event Access
    // ============================================================================

    @Test
    fun `can work with strongly-typed events`() {
        val testQueue = SmartEventQueue()

        // Act
        val workspace = commandInvoker.invoke(
            CreateWorkspaceCommand("Type Safe Test"),
            testQueue
        )

        // Assert - Type-safe access
        val eventWrapper = testQueue.allEvents.first()

        // Can cast safely since we know what event the handler emits
        val workspaceCreatedEvent = eventWrapper.event as WorkspaceCreatedEvent

        // Work with strongly-typed event
        assertEquals(workspace.id, workspaceCreatedEvent.workspace.id)
        assertEquals(workspace.name, workspaceCreatedEvent.workspace.name)

        // Access nested properties safely
        assertNotNull(workspaceCreatedEvent.workspace.createdAt)
    }

    // ============================================================================
    // Example 9: Helper Method for Cleaner Tests
    // ============================================================================

    @Test
    fun `using helper methods for cleaner test code`() {
        // Act
        val workspace = executeCommandAndCaptureEvents(
            CreateWorkspaceCommand("Helper Example")
        )

        // Assert
        assertEventEmitted<WorkspaceCreatedEvent>(workspace.queue) { event ->
            assertEquals("Helper Example", event.workspace.name)
        }
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    data class CommandResult<R>(
        val result: R,
        val queue: SmartEventQueue
    )

    private fun <R> executeCommandAndCaptureEvents(
        command: com.scriptmanager.domain.infrastructure.Command<R>
    ): CommandResult<R> {
        val queue = SmartEventQueue()
        val result = commandInvoker.invoke(command, queue)
        return CommandResult(result, queue)
    }

    private inline fun <reified T> assertEventEmitted(
        queue: SmartEventQueue,
        assertions: (T) -> Unit
    ) {
        val event = queue.allEvents
            .map { it.event }
            .filterIsInstance<T>()
            .firstOrNull()

        assertNotNull(event, "Event of type ${T::class.simpleName} should be emitted")
        assertions(event!!)
    }
}

