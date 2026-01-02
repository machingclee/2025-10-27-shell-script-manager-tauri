package com.scriptmanager.integration.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.UpdateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.DeleteWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.ReorderWorkspacesCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.domain.scriptmanager.event.WorkspaceUpdatedEvent
import com.scriptmanager.domain.scriptmanager.event.WorkspaceDeletedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for Workspace Lifecycle APIs
 * Maps to: POST /workspace, PUT /workspace/{id}, DELETE /workspace/{id}, PUT /workspace/reorder
 * Domain: com.scriptmanager.domain.scriptmanager
 *
 * This test class combines both creation and management operations for consistency
 * with the script lifecycle pattern.
 */
@SpringBootTest
class WorkspaceTest(
    private val eventRepository: EventRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {


    @BeforeEach
    fun emptyWorkspaceFolder() {
        workspaceRepository.deleteAll()
    }

    // ========== CREATION TESTS ==========

    @Test
    fun `should create workspace with valid name`() {
        // Arrange
        val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(workspaceName, result.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
            .filter { event ->
                val payload = objectMapper.readValue<WorkspaceCreatedEvent>(event.payload)
                payload.workspace.name == workspaceName
            }

        assertEquals(1, events.size, "Should have exactly 1 WorkspaceCreatedEvent")
        assertTrue(events.first().success)

        // Assert - Persistence
        val savedWorkspace = workspaceRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedWorkspace)
        assertEquals(workspaceName, savedWorkspace.toDTO().name)
    }

    @Test
    fun `should create multiple workspaces independently`() {
        // Arrange & Act
        val workspace1 = commandInvoker.invoke(CreateWorkspaceCommand("Workspace1_${System.currentTimeMillis()}"))
        val workspace2 = commandInvoker.invoke(CreateWorkspaceCommand("Workspace2_${System.currentTimeMillis()}"))

        // Assert
        assertNotEquals(workspace1.id, workspace2.id)
        assertEquals(2, workspaceRepository.findAll().size)

        // Assert - Both events exist
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
        assertEquals(2, events.size)
    }

    @Test
    fun `should handle workspace creation with special characters in name`() {
        // Arrange
        val workspaceName = "Test-Workspace_123_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))

        // Assert
        assertEquals(workspaceName, result.name)
        val savedWorkspace = workspaceRepository.findById(result.id!!).orElse(null)
        assertEquals(workspaceName, savedWorkspace.toDTO().name)
    }

    @Test
    fun `should handle workspace creation with empty name`() {
        // This test depends on your validation logic
        // If you allow empty names, test that behavior
        // If you reject them, test exception handling

        // Example if validation exists:
        // assertThrows<ValidationException> {
        //     commandInvoker.invoke(CreateWorkspaceCommand(""))
        // }
    }

    // ========== MANAGEMENT TESTS ==========

    @Test
    fun `should update workspace name`() {
        // Arrange - Create workspace first
        val original = commandInvoker.invoke(CreateWorkspaceCommand("Original_${System.currentTimeMillis()}"))
        val newName = "Updated_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(
            UpdateWorkspaceCommand(
                id = original.id!!,
                name = newName,
                ordering = original.ordering
            )
        )

        // Assert - Command result
        assertEquals(original.id!!, result.id!!)
        assertEquals(newName, result.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceUpdatedEvent" }
        assertEquals(1, events.size)

        val payload = objectMapper.readValue<WorkspaceUpdatedEvent>(events.first().payload)
        assertEquals(newName, payload.workspace.name)

        // Assert - Persistence
        val updated = workspaceRepository.findById(original.id!!).orElse(null)
        assertEquals(newName, updated.toDTO().name)
    }

    @Test
    fun `should delete workspace`() {
        // Arrange - Create workspace first
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("ToDelete_${System.currentTimeMillis()}"))

        // Act
        commandInvoker.invoke(DeleteWorkspaceCommand(workspace.id!!))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceDeletedEvent" }
        assertEquals(1, events.size)

        val payload = objectMapper.readValue<WorkspaceDeletedEvent>(events.first().payload)
        assertEquals(workspace.id!!, payload.workspaceId)

        // Assert - Persistence (workspace should be gone)
        assertFalse(workspaceRepository.findById(workspace.id!!).isPresent)
    }

    @Test
    fun `should reorder workspaces`() {
        // Arrange - Create multiple workspaces
        val ws1 = commandInvoker.invoke(CreateWorkspaceCommand("WS1_${System.currentTimeMillis()}"))
        val ws2 = commandInvoker.invoke(CreateWorkspaceCommand("WS2_${System.currentTimeMillis()}"))
        val ws3 = commandInvoker.invoke(CreateWorkspaceCommand("WS3_${System.currentTimeMillis()}"))

        // Act - Reorder to: ws3, ws1, ws2
        commandInvoker.invoke(ReorderWorkspacesCommand(ws1.ordering, ws2.ordering))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspacesReorderedEvent" }
        assertEquals(1, events.size)

        // Assert - Order in database matches
        val workspaces = workspaceRepository.findAll().sortedBy { it.ordering }
        assertEquals(3, workspaces.size)
        // Add assertions based on your sortOrder implementation
    }

    @Test
    fun `should handle update on non-existent workspace`() {
        // Act & Assert
        // This depends on your error handling strategy
        // Example:
        // assertThrows<NotFoundException> {
        //     commandInvoker.invoke(UpdateWorkspaceCommand(99999, "NonExistent"))
        // }
    }

    // ========== FULL LIFECYCLE TEST ==========

    @Test
    fun `should create, update, and delete workspace in full lifecycle`() {
        // Arrange
        val originalName = "LifecycleTest_${System.currentTimeMillis()}"
        val updatedName = "Updated_${System.currentTimeMillis()}"

        // Act 1: Create
        val created = commandInvoker.invoke(CreateWorkspaceCommand(originalName))

        // Assert 1: Creation
        assertNotNull(created.id)
        assertEquals(originalName, created.name)
        val createEvents = eventRepository.findAll().filter { it.eventType == "WorkspaceCreatedEvent" }
        assertEquals(1, createEvents.size)

        // Act 2: Update
        val updated = commandInvoker.invoke(
            UpdateWorkspaceCommand(
                id = created.id!!,
                name = updatedName,
                ordering = created.ordering
            )
        )

        // Assert 2: Update
        assertEquals(created.id, updated.id)
        assertEquals(updatedName, updated.name)
        val updateEvents = eventRepository.findAll().filter { it.eventType == "WorkspaceUpdatedEvent" }
        assertEquals(1, updateEvents.size)

        // Act 3: Delete
        commandInvoker.invoke(DeleteWorkspaceCommand(created.id!!))

        // Assert 3: Deletion
        val deleteEvents = eventRepository.findAll().filter { it.eventType == "WorkspaceDeletedEvent" }
        assertEquals(1, deleteEvents.size)
        assertFalse(workspaceRepository.findById(created.id!!).isPresent)
    }
}

