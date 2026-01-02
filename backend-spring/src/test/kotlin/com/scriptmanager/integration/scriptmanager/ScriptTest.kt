package com.scriptmanager.integration.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.*
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ShellScriptRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for Script Lifecycle APIs
 * Maps to: POST /script, PUT /script/{id}, DELETE /script/{id}
 * Also covers: POST /script/markdown, POST /script/{id}/history
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class ScriptTest(
    private val eventRepository: EventRepository,
    private val scriptRepository: ShellScriptRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create, update, and delete script in full lifecycle`() {
        // Arrange - Create folder to hold script
        val folder = commandInvoker.invoke(CreateFolderCommand("ScriptFolder_${System.currentTimeMillis()}"))
        val scriptName = "TestScript.sh"
        val originalContent = "echo 'Hello World'"
        val updatedContent = "echo 'Hello Updated World'"

        // Act 1: Create script
        val created = commandInvoker.invoke(CreateScriptCommand(folder.id!!, scriptName, originalContent))

        // Assert 1: Creation
        assertNotNull(created.id!!)
        assertEquals(scriptName, created.name)
        assertEquals(originalContent, created.command)

        val createEvents = eventRepository.findAll().filter { it.eventType == "ScriptCreatedEvent" }
        assertEquals(1, createEvents.size)

        // Act 2: Update script
        val updated = commandInvoker.invoke(
            UpdateScriptCommand(
                id = created.id!!,
                name = scriptName,
                command = updatedContent,
                showShell = created.showShell,
                locked = created.locked
            )
        )

        // Assert 2: Update
        assertEquals(created.id!!, updated.id!!)
        assertEquals(updatedContent, updated.command)

        val updateEvents = eventRepository.findAll().filter { it.eventType == "ScriptUpdatedEvent" }
        assertEquals(1, updateEvents.size)

        // Act 3: Delete script
        commandInvoker.invoke(
            DeleteScriptCommand(
                id = created.id!!,
                folderId = 0
            )
        )

        // Assert 3: Deletion
        val deleteEvents = eventRepository.findAll().filter { it.eventType == "ScriptDeletedEvent" }
        assertEquals(1, deleteEvents.size)

        assertFalse(scriptRepository.findById(created.id!!).isPresent)
    }

    @Test
    fun `should create markdown document`() {
        // Arrange
        val folder = commandInvoker.invoke(CreateFolderCommand("DocsFolder_${System.currentTimeMillis()}"))
        val markdownName = "README.md"
        val markdownContent = "# Documentation\n\nThis is a test document."

        // Act
        val result = commandInvoker.invoke(CreateMarkdownCommand(folder.id!!, markdownName, markdownContent))

        // Assert
        assertNotNull(result.id!!)
        assertEquals(markdownName, result.name)
        assertEquals(markdownContent, result.command)
    }

    @Test
    fun `should track script history`() {
        // Arrange - Create script
        val folder = commandInvoker.invoke(CreateFolderCommand("HistoryFolder_${System.currentTimeMillis()}"))
        val script = commandInvoker.invoke(CreateScriptCommand(folder.id!!, "versioned.sh", "v1 content"))

        // Act - Create history entry
        val historyContent = "v2 content with changes"
        //, historyContent
        commandInvoker.invoke(
            CreateScriptHistoryCommand(
                scriptId = script.id!!,
                time = System.currentTimeMillis()
            )
        )

        // Assert - History event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ScriptHistoryCreatedEvent" }
        assertEquals(1, events.size)

        // Verify history is persisted (depends on your repository setup)
    }

    @Test
    fun `should handle script with special characters in content`() {
        // Arrange
        val folder = commandInvoker.invoke(CreateFolderCommand("SpecialCharsFolder_${System.currentTimeMillis()}"))
        val complexContent = """
            #!/bin/bash
            echo "Testing 'quotes' and \"double quotes\""
            var=${'$'}(command)
            if [ ${'$'}? -eq 0 ]; then
                echo "Success"
            fi
        """.trimIndent()

        // Act
        val script = commandInvoker.invoke(CreateScriptCommand(folder.id!!, "complex.sh", complexContent))

        // Assert
        assertEquals(complexContent, script.command)
        val saved = scriptRepository.findById(script.id!!).orElse(null)
        assertEquals(complexContent, saved.command)
    }
}

