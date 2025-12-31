package com.scriptmanager.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional


/**
 * Complete examples of how to test events in your system using EventRepository.
 *
 * NOTE: This test does NOT use @Transactional because CommandInvoker manages
 * its own transactions via TransactionTemplate. Adding @Transactional here
 * would cause "Unable to rollback against JDBC Connection" errors.
 *
 * Each test creates real data in the database. If you need isolation between tests,
 * consider using @DirtiesContext or cleaning up data manually in @AfterEach.
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
class EventTestingExamples(
    private val commandInvoker: CommandInvoker,
    private val eventRepository: EventRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val entityManager: EntityManager,
    private val objectMapper: ObjectMapper
) {

    @AfterEach
    @Transactional  // Needed for EntityManager operations
    fun cleanup() {
        // Clear events and workspaces created during tests
        // Delete in correct order to avoid foreign key constraint violations
        try {
            // First, delete from join tables to avoid FK violations
            entityManager.createNativeQuery("DELETE FROM rel_workspace_folder").executeUpdate()

            // Then delete from main tables
            eventRepository.deleteAll()
            workspaceRepository.deleteAll()

            // Flush and clear persistence context
            entityManager.flush()
            entityManager.clear()
        } catch (e: Exception) {
            println("Warning: Cleanup failed: ${e.message}")
            e.printStackTrace()
            // Try to continue even if cleanup fails
        }
    }

    // ============================================================================
    // Example 1: Basic Event Testing
    // ============================================================================

    @Test
    fun `should emit WorkspaceCreatedEvent when creating workspace`() {
        val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"

        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))
        val events = eventRepository.findAllByEventType(
            eventType = "WorkspaceCreatedEvent"
        ).filter { event ->
            // Filter to only events for this specific workspace
            val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(event.event)
            eventData.workspace.name == workspaceName
        }

        // Verify event was created
        assertEquals(1, events.size, "Should have exactly 1 WorkspaceCreatedEvent for '$workspaceName'")

        val event = events.first()
        assertEquals("WorkspaceCreatedEvent", event.eventType)
        assertTrue(event.success, "Event should be successful")

        // Verify event content
        val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(event.event)
        assertEquals(workspaceName, eventData.workspace.name)
        assertEquals(result.id, eventData.workspace.id)
    }

    // ============================================================================
    // Example 2: Testing Event Content
    // ============================================================================

    @Test
    fun `WorkspaceCreatedEvent should contain correct workspace data`() {
        // Arrange
        val command = CreateWorkspaceCommand("My Test Workspace")

        // Act
        val workspace = commandInvoker.invoke(command)

        // Assert - Get the event
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
            .sortedByDescending { it.createdAt }
            .take(1)

        assertFalse(events.isEmpty(), "Should have WorkspaceCreatedEvent")

        val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(events.first().event)

        // Verify all workspace fields are correctly serialized in event
        assertEquals(workspace.id, eventData.workspace.id)
        assertEquals(workspace.name, eventData.workspace.name)
        assertEquals(workspace.ordering, eventData.workspace.ordering)
        assertNotNull(eventData.workspace.createdAt)
    }

    // ============================================================================
    // Example 3: Testing Cascading Events (Events triggering Events)
    // ============================================================================

    @Test
    fun `should handle cascading events when event triggers another command`() {
        // This example demonstrates testing when an event listener invokes another command
        // which in turn creates another event (like ScriptExecutedEvent → CreateScriptHistoryCommand)

        // Arrange
        val command = CreateWorkspaceCommand("Cascading Test Workspace")

        // Act
        commandInvoker.invoke(command)

        // Wait a bit for async event processing if using @Async listeners
        Thread.sleep(100)

        // Assert - Verify ALL events were created
        val allEvents = eventRepository.findAll()

        // Primary event
        val primaryEvents = allEvents.filter { it.eventType == "WorkspaceCreatedEvent" }
        assertTrue(primaryEvents.isNotEmpty(), "Should have primary WorkspaceCreatedEvent")

        // If WorkspaceCreatedEvent triggers a policy that creates another event,
        // you can verify the secondary event here
        // Example:
        // val secondaryEvents = allEvents.filter { it.eventType == "SomeSecondaryEvent" }
        // assertTrue(secondaryEvents.isNotEmpty(), "Should have secondary event")
    }

    // ============================================================================
    // Example 4: Testing Event Metadata
    // ============================================================================

    @Test
    fun `event should contain correct metadata (requestId, userEmail, timestamp)`() {
        // Arrange
        val command = CreateWorkspaceCommand("Metadata Test Workspace")

        // Act
        val result = commandInvoker.invoke(command)

        // Assert
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
            .sortedByDescending { it.createdAt }
            .take(1)

        val event = events.first()

        // Verify metadata
        assertNotNull(event.requestId, "Event should have requestId")
        assertNotNull(event.requestUserEmail, "Event should have user email")
        assertNotNull(event.createdAt, "Event should have timestamp")
        assertNotNull(event.createdAtHk, "Event should have Hong Kong timestamp")
        assertTrue(event.success, "Event should be marked as successful")
        assertEquals("", event.failureReason, "Successful event should have empty failure reason")
    }

    // ============================================================================
    // Example 5: Testing Multiple Events from One Command
    // ============================================================================

    @Test
    fun `command that emits multiple events should persist all events`() {
        // Some commands might emit multiple events
        // This example shows how to verify all of them

        // Arrange
        val command = CreateWorkspaceCommand("Multi-Event Workspace")

        // Act
        commandInvoker.invoke(command)

        // Assert - Get all events for this test
        val allEvents = eventRepository.findAll()
            .sortedByDescending { it.createdAt }

        // Verify expected event types exist
        val eventTypes = allEvents.map { it.eventType }.toSet()

        assertTrue(
            eventTypes.contains("WorkspaceCreatedEvent"),
            "Should have WorkspaceCreatedEvent"
        )

        // If your command emits other events, verify them too
        // assertTrue(eventTypes.contains("AnotherEventType"), "Should have AnotherEventType")
    }

    // ============================================================================
    // Example 6: Testing Event Ordering
    // ============================================================================

    @Test
    fun `events should be persisted in correct order`() {
        // Arrange & Act - Create multiple workspaces
        val workspace1 = commandInvoker.invoke(CreateWorkspaceCommand("First"))
        Thread.sleep(10) // Small delay to ensure different timestamps
        val workspace2 = commandInvoker.invoke(CreateWorkspaceCommand("Second"))
        Thread.sleep(10)
        val workspace3 = commandInvoker.invoke(CreateWorkspaceCommand("Third"))

        // Assert - Verify events are in order
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
            .sortedBy { it.createdAt }

        assertTrue(events.size >= 3, "Should have at least 3 events")

        // Verify timestamps are increasing
        for (i in 0 until events.size - 1) {
            assertTrue(
                events[i].createdAt!! < events[i + 1].createdAt!!,
                "Events should be ordered by timestamp"
            )
        }
    }

    // ============================================================================
    // Example 7: Helper Method Pattern (Recommended for Real Tests)
    // ============================================================================

    @Test
    fun `using helper methods for cleaner test code`() {
        // Arrange
        val command = CreateWorkspaceCommand("Helper Method Example")

        // Act
        val result = commandInvoker.invoke(command)

        // Assert - Using helper methods
        assertEventExists("WorkspaceCreatedEvent")
        assertEventContains<WorkspaceCreatedEvent>("WorkspaceCreatedEvent") { event ->
            assertEquals(result.name, event.workspace.name)
        }
    }

    // ============================================================================
    // Helper Methods for Event Assertions
    // ============================================================================

    private fun assertEventExists(eventType: String) {
        val events = eventRepository.findAll().filter { it.eventType == eventType }
        assertTrue(events.isNotEmpty(), "Event of type '$eventType' should exist")
    }

    private inline fun <reified T> assertEventContains(
        eventType: String,
        assertions: (T) -> Unit
    ) {
        val events = eventRepository.findAll()
            .filter { it.eventType == eventType }
            .sortedByDescending { it.createdAt }

        assertFalse(events.isEmpty(), "Should have event of type '$eventType'")

        val eventData = objectMapper.readValue<T>(events.first().event)
        assertions(eventData)
    }

    private fun getLatestEvent(eventType: String) =
        eventRepository.findAll()
            .filter { it.eventType == eventType }
            .maxByOrNull { it.createdAt ?: 0.0 }

    private fun getAllEventsOfType(eventType: String) =
        eventRepository.findAll()
            .filter { it.eventType == eventType }
            .sortedBy { it.createdAt }
}

