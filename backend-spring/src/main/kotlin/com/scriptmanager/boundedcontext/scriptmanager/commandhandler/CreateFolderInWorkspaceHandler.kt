package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.CreateFolderInWorkspaceCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderCreatedEvent
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderCreatedInWorkspaceEvent
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
) : CommandHandler<CreateFolderInWorkspaceCommand, ScriptsFolder> {

    override fun handle(eventQueue: EventQueue, command: CreateFolderInWorkspaceCommand): ScriptsFolder {
        val workspace = workspaceRepository.findByIdOrNull(command.workspaceId)
            ?: throw ScriptManagerException("Workspace not found")

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

        eventQueue.add(
            FolderCreatedInWorkspaceEvent(
                workspaceId = command.workspaceId,
                folder = newFolder.toResponse()
            )
        )
        eventQueue.add(
            FolderCreatedEvent(
                folder = newFolder.toDTO()
            )
        )
        return newFolder
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        FolderCreatedInWorkspaceEvent::class.java,
        FolderCreatedEvent::class.java
    )
}

