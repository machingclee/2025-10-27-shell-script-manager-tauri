package com.scriptmanager.integration.domain.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.folder.MoveFolderToWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.*
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.domain.scriptmanager.event.WorkspaceDeletedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.transaction.annotation.Transactional


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
    private val objectMapper: ObjectMapper,
    private val entityManager: EntityManager
) : BaseTest(eventRepository) {


    @BeforeEach
    fun emptyWorkspaces() {
        workspaceRepository.deleteAll()
    }

    @Test
    @Transactional
    fun `Should create workspace`() {
        // Arrange
        val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))

        // Assert - Command result
        assertNotNull(result.id)
        val savedWorkspace = workspaceRepository.findById(result.id!!).orElse(null)
        assertNotNull(savedWorkspace)
        assertEquals(workspaceName, savedWorkspace.name.value)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
        assertEquals(1, events.size)
        val event = objectMapper.readValue(events.first().payload, WorkspaceCreatedEvent::class.java)
        assertEquals(result.id, event.workspace.id)
    }

    @Test
    @Transactional
    fun `Should create folder in workspace`() {
        // Arrange - Create workspace first
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folderName = "FolderInWorkspace_${System.currentTimeMillis()}"

        // Act
        val folder = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, folderName))

        // Assert - Folder created
        assertNotNull(folder.id)
        assertEquals(folderName, folder.name)

        // Assert - Folder is in workspace
        val updatedWorkspace = workspaceRepository.findById(workspace.id!!).orElse(null)
        assertNotNull(updatedWorkspace)
        assertTrue(updatedWorkspace.folders.any { it.id == folder.id })

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "FolderCreatedInWorkspaceEvent" }
        assertEquals(1, events.size)
    }

    @Test
    @Transactional
    fun `Should update workspace`() {
        // Arrange - Create workspace first
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("OriginalName_${System.currentTimeMillis()}"))
        entityManager.refresh(workspace)
        // Act - Update workspace name
        val newName = "UpdatedName_${System.currentTimeMillis()}"
        val updateCommand = UpdateWorkspaceCommand(
            id = workspace.id!!,
            name = newName,
            ordering = workspace.ordering
        )
        commandInvoker.invoke(updateCommand)

        // Assert - Workspace name updated
        val updatedWorkspace = workspaceRepository.findByIdOrNull(workspace.id!!)
        assertNotNull(updatedWorkspace)
        assertEquals(newName, updatedWorkspace!!.name.value)

        // Assert - Update event emitted
        val updateEvents = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceUpdatedEvent" }
        assertEquals(1, updateEvents.size)
    }

    @Test
    @Transactional
    fun `Should delete workspace`() {
        // Arrange - Create workspace first
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("ToDelete_${System.currentTimeMillis()}"))
        entityManager.refresh(workspace)
        // Act
        commandInvoker.invoke(DeleteWorkspaceCommand(workspace.id!!))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceDeletedEvent" }
        assertEquals(1, events.size)

        val payload = objectMapper.readValue(events.first().payload, WorkspaceDeletedEvent::class.java)
        assertEquals(workspace.id!!, payload.workspaceId)

        // Assert - Persistence (workspace should be gone)
        assertFalse(workspaceRepository.findById(workspace.id!!).isPresent)
    }

    @Test
    @Transactional
    fun `Should reorder workspaces`() {
        // Arrange - Create multiple workspaces
        val ws1 = commandInvoker.invoke(CreateWorkspaceCommand("WS1_${System.currentTimeMillis()}"))
        val ws2 = commandInvoker.invoke(CreateWorkspaceCommand("WS2_${System.currentTimeMillis()}"))
        val ws3 = commandInvoker.invoke(CreateWorkspaceCommand("WS3_${System.currentTimeMillis()}"))
        entityManager.refresh(ws1)
        entityManager.refresh(ws2)
        entityManager.refresh(ws3)
        // Act - Reorder workspaces (move from index 0 to index 2)
        commandInvoker.invoke(ReorderWorkspacesCommand(fromIndex = 0, toIndex = 2))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspacesReorderedEvent" }
        assertEquals(1, events.size)

        // Assert - Order in database is updated
        val workspaces = workspaceRepository.findAll().sortedBy { it.ordering }
        assertEquals(3, workspaces.size)
        // Verify all workspaces have sequential ordering
        workspaces.forEachIndexed { index, workspace ->
            assertEquals(index, workspace.ordering)
        }
    }

    @Test
    @Transactional
    fun `Should reorder folders within workspace`() {
        // Arrange - Create workspace with multiple folders
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder1 = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, "Folder1"))
        val folder2 = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, "Folder2"))
        val folder3 = commandInvoker.invoke(CreateFolderInWorkspaceCommand(workspace.id!!, "Folder3"))

        // Act - Reorder folders (move from index 0 to index 2)
        // so [folder3, folder2, folder1] -> [folder2, folder1, folder3]

        // Refetch the entities and its relation
        entityManager.refresh(workspace)

        val orderedFolders = workspace.folders.sortedBy { it.ordering }
        assertEquals(folder3.id, orderedFolders[0].id)
        assertEquals(folder2.id, orderedFolders[1].id)
        assertEquals(folder1.id, orderedFolders[2].id)

        commandInvoker.invoke(
            ReorderWorkspaceFoldersCommand(
                workspaceId = workspace.id!!,
                fromIndex = 0,
                toIndex = 2
            )
        )

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceFoldersReorderedEvent" }
        assertEquals(1, events.size)

        // Assert - Folders are reordered
        entityManager.refresh(workspace)
        val reorderedFolders = workspace.folders.sortedBy { it.ordering }
        assertEquals(3, reorderedFolders.size)
        // Verify sequential ordering
        // verify [folder1, folder2, folder3] -> [folder2, folder3, folder1]
        reorderedFolders.forEachIndexed { index, folder ->
            assertEquals(reorderedFolders[0].id, folder2.id)
            assertEquals(reorderedFolders[0].ordering, 0)

            assertEquals(reorderedFolders[1].id, folder1.id)
            assertEquals(reorderedFolders[1].ordering, 1)

            assertEquals(reorderedFolders[2].id, folder3.id)
            assertEquals(reorderedFolders[2].ordering, 2)
        }
    }

    @Test
    @Transactional
    fun `Should move folder from one workspace to another workspace`() {
        // arrange
        val workspace1 = commandInvoker.invoke(
            CreateWorkspaceCommand("Workspace1_${System.currentTimeMillis()}")
        )
        val workspace2 = commandInvoker.invoke(
            CreateWorkspaceCommand("Workspace2_${System.currentTimeMillis()}")
        )
        val folder = commandInvoker.invoke(
            CreateFolderCommand("FolderToMove_${System.currentTimeMillis()}")
        )

        // idempotent test
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder.id!!))
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder.id!!))

        val reloadedWorkspace1 = workspaceRepository.findByIdOrNull(workspace1.id!!)
        assertNotNull(reloadedWorkspace1)
        assertTrue(reloadedWorkspace1!!.folders.size == 1)

        eventRepository.findAllByEventType("FolderAddedToWorkspaceEvent").let { events ->
            assertEquals(2, events.size, "Should emit two FolderAddedToWorkspaceEvent")
        }

        // act - move to different workspace
        commandInvoker.invoke(
            MoveFolderToWorkspaceCommand(
                workspaceId = workspace2.id!!,
                folderId = folder.id!!
            )
        )

        eventRepository.findAllByEventType("FolderAddedToWorkspaceEvent").let { events ->
            assertEquals(3, events.size, "Should emit three FolderAddedToWorkspaceEvent total")
        }

        val sourceWorkspace = workspaceRepository.findByIdOrNull(workspace1.id!!)
        val targetWorkspace = workspaceRepository.findByIdOrNull(workspace2.id!!)
        assertNotNull(sourceWorkspace)
        assertNotNull(targetWorkspace)
        assertEquals(0, sourceWorkspace!!.folders.size, "Source workspace should have 0 folders after move")
        assertEquals(1, targetWorkspace!!.folders.size, "Target workspace should have 1 folder after move")
    }

    @Test
    @Transactional
    fun `Moved folders should be in correct order`() {
        // arrange
        val workspace1 = commandInvoker.invoke(
            CreateWorkspaceCommand("Workspace1_${System.currentTimeMillis()}")
        )
        val workspace2 = commandInvoker.invoke(
            CreateWorkspaceCommand("Workspace2_${System.currentTimeMillis()}")
        )

        // create folders in workspace1
        val folder1 = commandInvoker.invoke(
            CreateFolderCommand("ExistingFolderInTarget_1_${System.currentTimeMillis()}")
        )
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder1.id!!))

        val folder2 = commandInvoker.invoke(
            CreateFolderCommand("ExistingFolderInTarget_2_${System.currentTimeMillis()}")
        )
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder2.id!!))

        val folder3 = commandInvoker.invoke(
            CreateFolderCommand("ExistingFolderInTarget_3_${System.currentTimeMillis()}")
        )
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder3.id!!))

        // create folder in workspace2
        val folder4 = commandInvoker.invoke(
            CreateFolderCommand("ExistingFolderInTarget_4_${System.currentTimeMillis()}")
        )
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace2.id!!, folder4.id!!))

        // current order in workspace1: [folder3, folder2, folder1] (assuming newest first)
        // current order in workspace2: [folder4]
        val ws1BeforeMove = workspaceRepository.findById(workspace1.id!!).orElse(null)
        assertNotNull(ws1BeforeMove)
        assertEquals(3, ws1BeforeMove.folders.size)

        // move the middle folder to another workspace
        commandInvoker.invoke(
            MoveFolderToWorkspaceCommand(
                workspaceId = workspace2.id!!,
                folderId = folder2.id!!
            )
        )

        val ws1AfterMove = workspaceRepository.findById(workspace1.id!!).orElse(null)
        val ws2AfterMove = workspaceRepository.findById(workspace2.id!!).orElse(null)
        assertNotNull(ws1AfterMove)
        assertNotNull(ws2AfterMove)

        val orderedFolders1 = ws1AfterMove.folders.sortedBy { it.ordering }
        assertEquals(2, orderedFolders1.size)
        assertEquals(orderedFolders1[0].id, folder3.id)
        assertEquals(orderedFolders1[0].ordering, 0)

        assertEquals(orderedFolders1[1].id, folder1.id)
        assertEquals(orderedFolders1[1].ordering, 1)

        val orderedFolders2 = ws2AfterMove.folders.sortedBy { it.ordering }
        assertEquals(2, orderedFolders2.size)
        assertEquals(orderedFolders2[0].id, folder2.id)
        assertEquals(orderedFolders2[0].ordering, 0)
        assertEquals(orderedFolders2[1].id, folder4.id)
        assertEquals(orderedFolders2[1].ordering, 1)
    }
}

