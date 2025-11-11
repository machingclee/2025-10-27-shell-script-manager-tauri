package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.dto.toWorkspaceWithFoldersDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.AddFolderToWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.FolderAddedToWorkspaceEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class AddFolderToWorkspaceHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val entityManager: EntityManager
) : CommandHandler<AddFolderToWorkspaceCommand, WorkspaceWithFoldersDTO> {

    override fun handle(eventQueue: EventQueue, command: AddFolderToWorkspaceCommand): WorkspaceWithFoldersDTO {
        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw Exception("Folder not found")
        val newWorkspace = workspaceRepository.findByIdOrNull(command.workspaceId)
            ?: throw Exception("Workspace not found")
        val originalParentWorkspace = workspaceRepository.findByIdOrNull(folder.parentWorkspace?.id ?: -1)

        folder.parentWorkspace = newWorkspace
        folder.ordering = -1
        workspaceRepository.save(newWorkspace)
        entityManager.flush()

        entityManager.refresh(newWorkspace)
        if (originalParentWorkspace != null) {
            entityManager.refresh(originalParentWorkspace)
        }

        newWorkspace.resetFolderOrders()
        originalParentWorkspace?.resetFolderOrders()

        val result = newWorkspace.toWorkspaceWithFoldersDTO()
        eventQueue.add(FolderAddedToWorkspaceEvent(result))

        return result
    }
}

