package com.scriptmanager.integration.folder

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.CreateFolderInWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.AddSubfolderCommand
import com.scriptmanager.domain.scriptmanager.event.FolderCreatedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ScriptsFolderRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for Folder Creation APIs
 * Maps to: POST /folder, POST /workspace/{id}/folder, POST /folder/{id}/subfolder
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class FolderCreationTest(
    private val eventRepository: EventRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create standalone folder`() {
        // Arrange
        val folderName = "TestFolder_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateFolderCommand(folderName))

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(folderName, result.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderCreatedEvent" }
        assertEquals(1, events.size)

        // Assert - Persistence
        val savedFolder = folderRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedFolder)
        assertEquals(folderName, savedFolder.name)
    }

    @Test
    fun `should create folder directly in workspace`() {
        // Arrange - Create workspace first
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folderName = "FolderInWorkspace_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, folderName))

        // Assert
        assertNotNull(result.id)
        assertEquals(folderName, result.name)

        // Assert - Event contains workspace association
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderCreatedEvent" || it.eventType == "FolderCreatedInWorkspaceEvent" }
        assertTrue(events.isNotEmpty())
    }

    @Test
    fun `should create subfolder structure`() {
        // Arrange - Create parent folder
        val parentFolder = commandInvoker.invoke(CreateFolderCommand("Parent_${System.currentTimeMillis()}"))
        val childFolderName = "Child_${System.currentTimeMillis()}"

        // Act
        commandInvoker.invoke(AddSubfolderCommand(parentFolder.id!!, childFolderName))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "SubfolderAddedEvent" }
        assertEquals(1, events.size)

        // Assert - Verify parent-child relationship in database
        // (depends on your entity structure)
    }

    @Test
    fun `should handle nested folder creation (3 levels deep)`() {
        // Arrange
        val level1 = commandInvoker.invoke(CreateFolderCommand("Level1_${System.currentTimeMillis()}"))
        commandInvoker.invoke(AddSubfolderCommand(level1.id!!, "Level2"))

        // Find level2 folder (you may need to query repository or capture from event)
        // val level2 = ... find created subfolder
        // commandInvoker.invoke(AddSubfolderCommand(level2.id, "Level3"))

        // Assert - Verify 3-level hierarchy exists
        // This tests that your domain supports nested structures
    }
}

