package com.scriptmanager.integration.workspace

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.UpdateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.DeleteWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.ReorderWorkspacesCommand
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
 * Tests for Workspace Management APIs
 * Maps to: PUT /workspace/{id}, DELETE /workspace/{id}, PUT /workspace/reorder
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class WorkspaceManagementTest(
    private val eventRepository: EventRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @BeforeEach
    fun emptyWorkspaceFolder() {
        workspaceRepository.deleteAll()
    }
    
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
}

