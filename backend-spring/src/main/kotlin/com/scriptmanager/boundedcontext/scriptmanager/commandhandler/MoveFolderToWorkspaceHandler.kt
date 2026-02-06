package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.dto.toWorkspaceWithFoldersDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.MoveFolderToWorkspaceCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderAddedToWorkspaceEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class MoveFolderToWorkspaceHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val entityManager: EntityManager
) : CommandHandler<MoveFolderToWorkspaceCommand, WorkspaceWithFoldersDTO> {

    override fun handle(eventQueue: EventQueue, command: MoveFolderToWorkspaceCommand): WorkspaceWithFoldersDTO {
        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw ScriptManagerException("Folder not found")
        val newWorkspace = workspaceRepository.findByIdOrNull(command.workspaceId)
            ?: throw ScriptManagerException("Workspace not found")

        val originalParentWorkspace = workspaceRepository.findByIdOrNull(folder.parentWorkspace?.id ?: -1)
        if (originalParentWorkspace != null) {
            originalParentWorkspace.removeAndReorderFolder(folder)
            entityManager.flush()
            entityManager.refresh(originalParentWorkspace)
        }

        newWorkspace.addAndReorderFolder(folder)
        folder.ordering = -1
        entityManager.flush()
        entityManager.refresh(newWorkspace)

        newWorkspace.resetFolderOrders()
        originalParentWorkspace?.resetFolderOrders()

        val result = newWorkspace.toWorkspaceWithFoldersDTO()
        eventQueue.add(FolderAddedToWorkspaceEvent(result))

        return result
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        FolderAddedToWorkspaceEvent::class.java
    )
}
