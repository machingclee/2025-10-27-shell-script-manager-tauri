package com.scriptmanager.integration.domain.scriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.folder.MoveFolderToWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
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
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {


    @BeforeEach
    fun emptyWorkspaces() {
        workspaceRepository.deleteAll()
    }

    // ========== CREATION TESTS ==========


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
        commandInvoker.invoke(MoveFolderToWorkspaceCommand(workspace1.id!!, folder.id!!))

        // act - move to same workspace (should be no-op but still emit event)
        commandInvoker.invoke(
            MoveFolderToWorkspaceCommand(
                workspaceId = workspace1.id!!,
                folderId = folder.id!!
            )
        )

        val reloadedWorkspace1 = workspaceRepository.findById(workspace1.id!!).orElse(null)
        assertNotNull(reloadedWorkspace1)
        assertTrue(reloadedWorkspace1.folders.size == 1)

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

        val sourceWorkspace = workspaceRepository.findById(workspace1.id!!).orElse(null)
        val targetWorkspace = workspaceRepository.findById(workspace2.id!!).orElse(null)
        assertNotNull(sourceWorkspace)
        assertNotNull(targetWorkspace)
        assertEquals(0, sourceWorkspace.folders.size, "Source workspace should have 0 folders after move")
        assertEquals(1, targetWorkspace.folders.size, "Target workspace should have 1 folder after move")
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

