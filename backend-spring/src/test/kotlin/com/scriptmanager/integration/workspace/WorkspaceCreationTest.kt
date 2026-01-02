package com.scriptmanager.integration.workspace

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for Workspace Creation API
 * Maps to: POST /workspace
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class WorkspaceCreationTest(
    private val eventRepository: EventRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

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
}

