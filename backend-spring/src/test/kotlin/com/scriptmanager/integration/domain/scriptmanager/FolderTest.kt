package com.scriptmanager.integration.domain.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.MoveFolderToWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.folder.DeleteFolderCommand
import com.scriptmanager.domain.scriptmanager.command.folder.RemoveFolderFromWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.folder.ReorderScriptsCommand
import com.scriptmanager.domain.scriptmanager.command.folder.UpdateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.domain.scriptmanager.command.folder.AddSubfolderCommand
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.script.MoveScriptToFolderCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateFolderInWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.FolderDeletedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.junit.Before
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
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
    private val shellScriptRepository: ShellScriptRepository,
    private val objectMapper: ObjectMapper,
    private val entityManager: EntityManager,
    private val workspaceRepository: WorkspaceRepository
) : BaseTest(eventRepository) {

    @BeforeEach
    fun emptyFolders() {
        folderRepository.deleteAll()
    }


    @Test
    @Transactional
    fun `Should add folder to workspace`() {
        // Arrange - Create workspace and folder
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder = commandInvoker.invoke(CreateFolderCommand("Folder_${System.currentTimeMillis()}"))

        // Act - Add folder to workspace
        val result = commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace.id!!, folder.id!!))

        // Assert - Folder added to workspace
        assertNotNull(result)
        val updatedWorkspace = workspaceRepository.findById(workspace.id!!).orElse(null)
        assertNotNull(updatedWorkspace)
        assertTrue(updatedWorkspace.folders.any { it.id == folder.id })

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderAddedToWorkspaceEvent" }
        assertEquals(1, events.size)
    }

    @Test
    fun `Should add subfolder to folder`() {
        // Arrange - Create parent folder
        val parentFolder = commandInvoker.invoke(CreateFolderCommand("ParentFolder_${System.currentTimeMillis()}"))

        // Act - Add subfolder to parent folder
        val subfolderName = "Subfolder_${System.currentTimeMillis()}"
        val subfolder = commandInvoker.invoke(AddSubfolderCommand(parentFolder.id!!, subfolderName))

        // Assert - Subfolder created
        assertNotNull(subfolder.id)
        assertEquals(subfolderName, subfolder.name)
        val savedSubfolder = folderRepository.findById(subfolder.id!!).orElse(null)
        assertNotNull(savedSubfolder)
        assertEquals(parentFolder.id, savedSubfolder.parentFolder?.id)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "SubfolderAddedEvent" }
        assertEquals(1, events.size)
    }

    @Test
    fun `Should create folder`() {
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

    @Nested
    @DisplayName("Should delete folder and its children")
    open inner class ShouldDeleteFolderAndChildren {
        private lateinit var parentFolder: ScriptsFolder
        private lateinit var subfolder: ScriptsFolder
        private lateinit var scriptInSubfolder: ShellScriptResponse
        private lateinit var scriptInfolder: ShellScriptResponse

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

            scriptInfolder = commandInvoker.invoke(
                CreateScriptCommand(
                    folderId = subfolder.id!!,
                    name = "Script_${System.currentTimeMillis()}_in_folder",
                    content = "echo 'Hello, World!'"
                )
            )

            scriptInSubfolder = commandInvoker.invoke(
                CreateScriptCommand(
                    folderId = parentFolder.id!!,
                    name = "Script_${System.currentTimeMillis()}_in_subfolder",
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
                shellScriptRepository.findByIdOrNull(scriptInfolder.id!!),
                "Script should be deleted"
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
            assertEquals(2, scriptCreatedEvents.size, "Should have 2 ScriptCreatedEvent from setup")

            assertEquals(2, folderDeletedEvents.size, "Should emit 2 FolderDeletedEvents")
            assertEquals(2, scriptDeletedEvents.size, "Should emit 2 ScriptDeletedEvent")
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
    fun `Should Remove Folder from Workspace`() {
        // Arrange - Create workspace and add folder
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder = commandInvoker.invoke(CreateFolderCommand("Folder_${System.currentTimeMillis()}"))
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace.id!!, folder.id!!))
        entityManager.flush()

        // Act - Remove folder from workspace
        commandInvoker.invoke(RemoveFolderFromWorkspaceCommand(folder.id!!))
        entityManager.flush()
        entityManager.clear()

        val updatedWorkspace = workspaceRepository.findByIdOrNull(workspace.id!!)
        val orphanedRootLevelFolders = folderRepository.findAllRootLevelFolder()
        assertNotNull(updatedWorkspace)
        // After removal, the folder should be an orphaned root-level folder
        assertTrue(orphanedRootLevelFolders.any { it.id == folder.id }, "Removed folder should be in orphaned root-level folders")
        assertFalse(updatedWorkspace!!.folders.any { it.id == folder.id })

        // Assert - Folder still exists (not deleted, just removed from workspace)
        val folderStillExists = folderRepository.findById(folder.id!!).orElse(null)
        assertNotNull(folderStillExists)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderRemovedFromWorkspaceEvent" }
        assertEquals(1, events.size)
    }

    @Test
    @Transactional
    fun `Should reorder scripts`() {
        // Arrange - Create folder with scripts
        val folder = commandInvoker.invoke(CreateFolderCommand("Folder_${System.currentTimeMillis()}"))
        val script1 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "Script1_${System.currentTimeMillis()}",
                content = "echo 'Script 1'"
            )
        )
        val script2 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "Script2_${System.currentTimeMillis()}",
                content = "echo 'Script 2'"
            )
        )
        val script3 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = folder.id!!,
                name = "Script3_${System.currentTimeMillis()}",
                content = "echo 'Script 3'"
            )
        )

        // Act - Reorder scripts (move script from index 0 to index 2)
        commandInvoker.invoke(ReorderScriptsCommand(folder.id!!, fromIndex = 0, toIndex = 2))

        // Assert - Scripts reordered
        val updatedFolder = folderRepository.findById(folder.id!!).orElse(null)
        assertNotNull(updatedFolder)
        val scripts = updatedFolder.shellScripts.sortedBy { it.ordering }
        assertEquals(3, scripts.size)

        // After reordering, the script at index 0 should now be at the end
        // The order should be: script2, script3, script1

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ScriptsReorderedEvent" }
        assertEquals(1, events.size)
    }


    @Test
    fun `should update folder`() {
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

    @Test
    @Transactional
    fun `Should move script from one folder to another folder`() {
        // arrnage
        val parentFolder1 = commandInvoker.invoke(
            CreateFolderCommand("ParentFolder1_${System.currentTimeMillis()}")
        )
        val parentFolder2 = commandInvoker.invoke(
            CreateFolderCommand("ParentFolder2_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = parentFolder1.id!!,
                name = "ScriptToMove_${System.currentTimeMillis()}",
                content = "echo 'Hello, World!'"
            )
        )

        // act
        commandInvoker.invoke(
            MoveScriptToFolderCommand(
                scriptId = script.id!!,
                targetFolderId = parentFolder1.id!!
            )
        )


        entityManager.refresh(parentFolder1)
        assertTrue(parentFolder1.shellScripts.size == 1)

        eventRepository.findAllByEventType("ScriptMovedToFolderEvent").let { events ->
            assertEquals(1, events.size, "Should emit one ScriptMovedToFolderEvent")
        }

        commandInvoker.invoke(
            MoveScriptToFolderCommand(
                scriptId = script.id!!,
                targetFolderId = parentFolder2.id!!
            )
        )

        eventRepository.findAllByEventType("ScriptMovedToFolderEvent").let { events ->
            assertEquals(2, events.size, "Should emit one ScriptMovedToFolderEvent")
        }

        entityManager.refresh(parentFolder1)
        entityManager.refresh(parentFolder2)
        assertEquals(parentFolder1!!.shellScripts.size, 0, "Source folder should have 0 scripts after move")
        assertEquals(parentFolder2!!.shellScripts.size, 1, "Target folder should have 1 script after move")
    }

    @Test
    @Transactional
    fun `Moved scripts should be in correct order`() {
        // arrange
        val parentFolder1 = commandInvoker.invoke(
            CreateFolderCommand("ParentFolder1_${System.currentTimeMillis()}")
        )
        val parentFolder2 = commandInvoker.invoke(
            CreateFolderCommand("ParentFolder2_${System.currentTimeMillis()}")
        )
        // act
        // our script creation always sort script to the top (order 0)
        val script1 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = parentFolder1.id!!,
                name = "ExistingScriptInTarget_1_${System.currentTimeMillis()}",
                content = "echo 'I am already here!'"
            )
        )
        val script2 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = parentFolder1.id!!,
                name = "ExistingScriptInTarget_2_${System.currentTimeMillis()}",
                content = "echo 'I am already here!'"
            )
        )
        val script3 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = parentFolder1.id!!,
                name = "ExistingScriptInTarget_3_${System.currentTimeMillis()}",
                content = "echo 'I am already here!'"
            )
        )
        val script4 = commandInvoker.invoke(
            CreateScriptCommand(
                folderId = parentFolder2.id!!,
                name = "ExistingScriptInTarget_3_${System.currentTimeMillis()}",
                content = "echo 'I am already here!'"
            )
        )


        // current order in folder1: [script3, script2, script1]
        // current order in folder2: [script4]
        entityManager.refresh(parentFolder1)
        assertEquals(3, parentFolder1.shellScripts.size)

        // move the middle one to another folder
        commandInvoker.invoke(
            MoveScriptToFolderCommand(
                scriptId = script2.id!!,
                targetFolderId = parentFolder2.id!!
            )
        )

        entityManager.refresh(parentFolder1)
        entityManager.refresh(parentFolder2)

        val orderedScripts1 = parentFolder1.shellScripts.sortedBy { it.ordering }
        assertEquals(orderedScripts1[0].id, script3.id)
        assertEquals(orderedScripts1[0].ordering, 0)

        assertEquals(orderedScripts1[1].id, script1.id)
        assertEquals(orderedScripts1[1].ordering, 1)

        val orderedScripts2 = parentFolder2.shellScripts.sortedBy { it.ordering }

        assertEquals(2, orderedScripts2.size)
        assertEquals(orderedScripts2[0].id, script2.id)
        assertEquals(orderedScripts2[0].ordering, 0)
        assertEquals(orderedScripts2[1].id, script4.id)
        assertEquals(orderedScripts2[1].ordering, 1)
    }

}

