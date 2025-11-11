package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateFolderInWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.FolderCreatedInWorkspaceEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateFolderInWorkspaceHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val entityManager: EntityManager
) : CommandHandler<CreateFolderInWorkspaceCommand, ScriptsFolderResponse> {

    override fun handle(eventQueue: EventQueue, command: CreateFolderInWorkspaceCommand): ScriptsFolderResponse {
        val workspace = workspaceRepository.findByIdOrNull(command.workspaceId)
            ?: throw Exception("Workspace not found")

        val newFolder = folderRepository.save(
            ScriptsFolder(
                name = command.name,
                ordering = -1
            )
        )
        workspace.folders.add(newFolder)
        workspace.resetFolderOrders()
        workspaceRepository.save(workspace)
        entityManager.flush()
        entityManager.refresh(newFolder)

        val response = newFolder.toResponse()
        eventQueue.add(
            FolderCreatedInWorkspaceEvent(
                workspaceId = command.workspaceId,
                folder = response
            )
        )

        return response
    }
}

