package com.scriptmanager.integration.domain.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.script.*
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.transaction.annotation.Transactional


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
    private val folderRepository: ScriptsFolderRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper,
    private val entityManager: EntityManager
) : BaseTest(eventRepository) {

    @Test
    @Transactional
    fun `Should create script`() {
        // Arrange - Create folder first
        val folder = commandInvoker.invoke(CreateFolderCommand("TestFolder_${System.currentTimeMillis()}"))
        val scriptName = "TestScript_${System.currentTimeMillis()}"
        val scriptContent = "echo 'Hello World'"

        // Act
        val result = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = scriptName,
                content = scriptContent
            )
        )

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(scriptName, result.name)
        assertEquals(scriptContent, result.command)
        assertFalse(result.isMarkdown)

        // Assert - Persistence
        val savedScript = scriptRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedScript)
        assertEquals(scriptName, savedScript.name)
        assertEquals(scriptContent, savedScript.command)

        // Assert - Script is in folder
        val updatedFolder = folderRepository.findById(folder.id!!).orElse(null)
        assertNotNull(updatedFolder)
        assertTrue(updatedFolder.shellScripts.any { it.id == result.id })

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ScriptCreatedEvent" }
        assertEquals(1, events.size)
    }

    @Test
    @Transactional
    fun `Should create markdown script`() {
        // Arrange - Create folder first
        val folder = commandInvoker.invoke(CreateFolderCommand("MarkdownFolder_${System.currentTimeMillis()}"))
        val markdownName = "README_${System.currentTimeMillis()}"
        val markdownContent = "# Hello World\nThis is markdown content"

        // Act
        val result = commandInvoker.invoke(
            CreateMarkdownCommand(
                folderId = folder.id!!,
                name = markdownName,
                content = markdownContent
            )
        )

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(markdownName, result.name)
        assertEquals(markdownContent, result.command)
        assertTrue(result.isMarkdown)

        // Assert - Persistence
        val savedScript = scriptRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedScript)
        assertTrue(savedScript.isMarkdown)
        assertEquals(markdownContent, savedScript.command)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "MarkdownCreatedEvent" }
        assertEquals(1, events.size)
    }

    @Test
    @Transactional
    fun `Should update script`() {
        // Arrange - Create folder and script
        val folder = commandInvoker.invoke(CreateFolderCommand("UpdateFolder_${System.currentTimeMillis()}"))
        val script = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "OriginalName",
                content = "echo 'original'"
            )
        )

        // Act - Update script
        val newName = "UpdatedName_${System.currentTimeMillis()}"
        val newContent = "echo 'updated'"
        val updateCommand = UpdateScriptCommand(
            id = script.id!!,
            name = newName,
            command = newContent,
            showShell = true,
            locked = false
        )
        commandInvoker.invoke(updateCommand)

        // Assert - Script updated
        val updatedScript = scriptRepository.findById(script.id!!).orElse(null)
        assertNotNull(updatedScript)
        assertEquals(newName, updatedScript.name)
        assertEquals(newContent, updatedScript.command)
        assertTrue(updatedScript.showShell)
        assertFalse(updatedScript.locked!!)

        // Assert - Update event emitted
        val updateEvents = eventRepository.findAll()
            .filter { it.eventType == "ScriptUpdatedEvent" }
        assertEquals(1, updateEvents.size)
    }

    @Test
    @Transactional
    fun `Should update markdown`() {
        // Arrange - Create folder and markdown
        val folder = commandInvoker.invoke(CreateFolderCommand("MarkdownUpdateFolder_${System.currentTimeMillis()}"))
        val markdown = commandInvoker.invoke(
            CreateMarkdownCommand(
                folderId = folder.id!!,
                name = "OriginalMarkdown",
                content = "# Original"
            )
        )

        // Act - Update markdown
        val newName = "UpdatedMarkdown_${System.currentTimeMillis()}"
        val newContent = "# Updated\nNew content"
        val updateCommand = UpdateMarkdownCommand(
            scriptId = markdown.id!!,
            name = newName,
            content = newContent
        )
        commandInvoker.invoke(updateCommand)

        // Assert - Markdown updated
        val updatedMarkdown = scriptRepository.findById(markdown.id!!).orElse(null)
        assertNotNull(updatedMarkdown)
        assertEquals(newName, updatedMarkdown.name)
        assertEquals(newContent, updatedMarkdown.command)
        assertTrue(updatedMarkdown.isMarkdown)

        // Assert - Update event emitted
        val updateEvents = eventRepository.findAll()
            .filter { it.eventType == "MarkdownUpdatedEvent" }
        assertEquals(1, updateEvents.size)
    }

    @Test
    @Transactional
    fun `Should delete script`() {
        // Arrange - Create folder and script
        val folder = commandInvoker.invoke(CreateFolderCommand("DeleteFolder_${System.currentTimeMillis()}"))
        val script = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "ScriptToDelete",
                content = "echo 'delete me'"
            )
        )

        // Act - Delete script
        commandInvoker.invoke(DeleteScriptCommand(scriptId = script.id!!, folderId = folder.id!!))
        //entityManager.flush()
        // Assert - Script deleted
        val sriptShouldHaveBeenDeleted = scriptRepository.findByIdOrNull(script.id!!)
        assertNull(sriptShouldHaveBeenDeleted)

        // Assert - Delete event emitted
        val deleteEvents = eventRepository.findAll()
            .filter { it.eventType == "ScriptDeletedEvent" }
        assertEquals(1, deleteEvents.size)
    }

    @Test
    @Transactional
    fun `Should move script to different folder`() {
        // Arrange - Create two folders and a script
        val sourceFolder = commandInvoker.invoke(CreateFolderCommand("SourceFolder_${System.currentTimeMillis()}"))
        val targetFolder = commandInvoker.invoke(CreateFolderCommand("TargetFolder_${System.currentTimeMillis()}"))
        val script = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = sourceFolder.id!!,
                name = "ScriptToMove",
                content = "echo 'move me'"
            )
        )

        // Act - Move script
        commandInvoker.invoke(
            MoveScriptToFolderCommand(
                scriptId = script.id!!,
                targetFolderId = targetFolder.id!!
            )
        )

        // Assert - Script moved to target folder
        val reloadedTargetFolder = folderRepository.findById(targetFolder.id!!).orElse(null)
        assertNotNull(reloadedTargetFolder)
        assertTrue(reloadedTargetFolder.shellScripts.any { it.id == script.id })

        // Assert - Script removed from source folder
        val reloadedSourceFolder = folderRepository.findById(sourceFolder.id!!).orElse(null)
        assertNotNull(reloadedSourceFolder)
        assertFalse(reloadedSourceFolder.shellScripts.any { it.id == script.id })

        // Assert - Move event emitted
        val moveEvents = eventRepository.findAll()
            .filter { it.eventType == "ScriptMovedToFolderEvent" }
        assertEquals(1, moveEvents.size)
    }

    @Test
    @Transactional
    fun `Should create script history`() {
        // Arrange - Create folder and script
        val folder = commandInvoker.invoke(CreateFolderCommand("HistoryFolder_${System.currentTimeMillis()}"))
        val script = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "ScriptWithHistory",
                content = "echo 'history'"
            )
        )

        // Act - Create history entry
        val historyTime = System.currentTimeMillis()
        commandInvoker.invoke(
            CreateScriptHistoryCommand(
                scriptId = script.id!!,
                time = historyTime
            )
        )

        // Assert - History event emitted
        val historyEvents = eventRepository.findAll()
            .filter { it.eventType == "ScriptHistoryCreatedEvent" }
        assertEquals(1, historyEvents.size)
    }
}

