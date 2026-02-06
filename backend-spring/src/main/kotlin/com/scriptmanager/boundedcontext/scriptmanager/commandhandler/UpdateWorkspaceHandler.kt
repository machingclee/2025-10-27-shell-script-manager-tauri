package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.UpdateWorkspaceCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.WorkspaceUpdatedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<UpdateWorkspaceCommand, WorkspaceDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateWorkspaceCommand): WorkspaceDTO {
        val workspace = workspaceRepository.findByIdOrNull(command.id)
            ?: throw ScriptManagerException("Workspace not found")

        workspace.name = Workspace.Name(command.name)
        workspace.ordering = command.ordering

        val result = workspaceRepository.save(workspace)
        val dto = result.toDTO()

        eventQueue.add(WorkspaceUpdatedEvent(dto))

        return dto
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        WorkspaceUpdatedEvent::class.java
    )
}
