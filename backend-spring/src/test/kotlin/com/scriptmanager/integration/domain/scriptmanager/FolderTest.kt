package com.scriptmanager.integration.domain.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.*
import com.scriptmanager.domain.scriptmanager.event.FolderDeletedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.transaction.annotation.Transactional


/**
 * Tests for Folder Creation APIs
 * Maps to: POST /folder, POST /workspace/{id}/folder, POST /folder/{id}/subfolder
 * Domain: com.scriptmanager.domain.scriptmanager
 */
@SpringBootTest
class FolderTest(
    private val eventRepository: EventRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper,
    private val entityManager: EntityManager
) : BaseTest(eventRepository) {


    @Autowired
    private lateinit var shellScriptRepository: ShellScriptRepository

    @Autowired
    private lateinit var scriptsFolderRepository: ScriptsFolderRepository

    @Test
    fun `should create folder`() {
        // Arrange
        val folderName = "TestFolder_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateFolderCommand(folderName))

        // Assert - Command result
        assertNotNull(result.id)
        val savedFolder = folderRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedFolder)
        assertEquals(folderName, savedFolder.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderCreatedEvent" }
        assertEquals(1, events.size)
    }

    @Test
    fun `should update folder name`() {
        // Arrange - Create workspace with folder
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("WorkspaceForFolder_${System.currentTimeMillis()}"))
        val folderName = "FolderInWorkspace_${System.currentTimeMillis()}"
        val savedFolder = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, folderName))

        // Act - Update folder name
        val newFolderName = "UpdatedFolderName_${System.currentTimeMillis()}"
        val updateCommand = UpdateFolderCommand(
            id = savedFolder.id!!,
            name = newFolderName,
            ordering = savedFolder.ordering
        )
        commandInvoker.invoke(updateCommand)

        // Assert - Folder name updated
        val updatedFolder = folderRepository.findById(savedFolder.id!!).orElse(null)
        assertNotNull(updatedFolder)
        assertEquals(newFolderName, updatedFolder.name)

        // Assert - Update event emitted
        val updateEvents = eventRepository.findAll()
            .filter { it.eventType == "FolderUpdatedEvent" }
        assertEquals(1, updateEvents.size)
    }


    @Nested
    @DisplayName("Cascade Deletion")
    open inner class CascadeDeletionTests {
        private lateinit var parentFolder: ScriptsFolder
        private lateinit var subfolder: ScriptsFolder
        private lateinit var scriptInSubfolder: ShellScriptResponse

        @BeforeEach
        @Transactional
        open fun arrange() {
            parentFolder = commandInvoker.invoke(
                CreateFolderCommand("Parent_${System.currentTimeMillis()}")
            )

            subfolder = commandInvoker.invoke(
                AddSubfolderCommand(
                    parentFolderId = parentFolder.id!!,
                    name = "Subfolder_${System.currentTimeMillis()}"
                )
            )

            this@FolderTest.entityManager.flush()

            scriptInSubfolder = commandInvoker.invoke(
                CreateScriptCommand(
                    folderId = subfolder.id!!,
                    name = "Script_${System.currentTimeMillis()}",
                    content = "echo 'Hello, World!'"
                )
            )
        }

        @Test
        @Transactional
        open fun `should delete folder, subfolders and all scripts inside`() {
            // Act
            commandInvoker.invoke(DeleteFolderCommand(parentFolder.id!!))
            this@FolderTest.entityManager.flush()

            // Assert - All entities deleted
            assertNull(
                folderRepository.findByIdOrNull(parentFolder.id!!),
                "Parent folder should be deleted"
            )
            assertNull(
                folderRepository.findByIdOrNull(subfolder.id!!),
                "Subfolder should be deleted"
            )
            assertNull(
                shellScriptRepository.findByIdOrNull(scriptInSubfolder.id!!),
                "Script should be deleted"
            )

            // Assert - Events emitted
            val events = eventRepository.findAll()
            val folderCreatedEvents = events.filter { it.eventType == "FolderCreatedEvent" }
            val subfolderCreatedEvents = events.filter { it.eventType == "SubfolderAddedEvent" }
            val scriptCreatedEvents = events.filter { it.eventType == "ScriptCreatedEvent" }
            val folderDeletedEvents = events.filter { it.eventType == "FolderDeletedEvent" }
            val scriptDeletedEvents = events.filter { it.eventType == "ScriptDeletedEvent" }

            assertEquals(1, folderCreatedEvents.size, "Should have 1 FolderCreatedEvents from setup")
            assertEquals(1, subfolderCreatedEvents.size, "Should have 1 SubfolderAddedEvent from setup")
            assertEquals(1, scriptCreatedEvents.size, "Should have 1 ScriptCreatedEvent from setup")

            assertEquals(2, folderDeletedEvents.size, "Should emit 2 FolderDeletedEvents")
            assertEquals(1, scriptDeletedEvents.size, "Should emit 1 ScriptDeletedEvent")
        }

        @Test
        @Transactional
        open fun `should emit events with correct folder IDs`() {
            // Act
            commandInvoker.invoke(DeleteFolderCommand(parentFolder.id!!))
            this@FolderTest.entityManager.flush()
            // Assert
            val folderDeleteEvents = eventRepository.findAll()
                .filter { it.eventType == "FolderDeletedEvent" }
                .map { objectMapper.readValue<FolderDeletedEvent>(it.payload) }

            assertTrue(
                folderDeleteEvents.any { it.folderId == parentFolder.id!! },
                "Should emit event for parent folder"
            )
            assertTrue(
                folderDeleteEvents.any { it.folderId == subfolder.id!! },
                "Should emit event for subfolder"
            )
        }
    }

    @Test
    @Transactional
    fun `should delete folder, subfolders and all scripts inside of it`() {
        // Arrange - Create folder
        val folderName = "FolderToDelete_${System.currentTimeMillis()}"
        val subfolderName = "SubfolderToDelete_${System.currentTimeMillis()}"
        val parentFolder = commandInvoker.invoke(CreateFolderCommand(folderName))

        val subfolder = commandInvoker.invoke(
            AddSubfolderCommand(
                parentFolderId = parentFolder.id!!,
                name = subfolderName
            )
        )

        entityManager.flush()

        val subscript = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = subfolder.id!!,
                name = "ScriptInSubfolder_${System.currentTimeMillis()}",
                content = "echo 'Hello, World!'"
            )
        )

        entityManager.flush()

        val updatedFolder = folderRepository.findByIdOrNull(parentFolder.id!!)
        val subfolders = updatedFolder!!.subfolders
        val shellScriptsInSubfolder = subfolders.flatMap { it.shellScripts }
        assertEquals(subfolders.size, 1)
        assertEquals(shellScriptsInSubfolder.size, 1)
        assertNotNull(subfolder.id!!)
        assertNotNull(subscript.id!!)

        val persistedSubfolder = subfolders.first()
        val persistedScript = shellScriptsInSubfolder.first()

        // Act
        commandInvoker.invoke(DeleteFolderCommand(folderId = parentFolder.id!!))

        // Assert
        val deletedFolder = folderRepository.findByIdOrNull(parentFolder.id!!)
        val deletedSubfolder = folderRepository.findByIdOrNull(persistedSubfolder.id!!)
        val deleteSubscript = shellScriptRepository.findByIdOrNull(persistedScript.id!!)
        assertNull(deletedFolder)
        assertNull(deletedSubfolder)
        assertNull(deleteSubscript)
        // Assert - Event emitted
        val deleteEvents = eventRepository.findAll()
            .filter { it.eventType == "FolderDeletedEvent" || it.eventType == "ScriptDeletedEvent" }

        assertEquals(3, deleteEvents.size)
    }


}

