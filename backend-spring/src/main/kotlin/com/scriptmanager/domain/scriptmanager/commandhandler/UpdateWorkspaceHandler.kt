package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.UpdateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceUpdatedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<UpdateWorkspaceCommand, WorkspaceDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateWorkspaceCommand): WorkspaceDTO {
        // Validate workspace name
        require(command.name.isNotBlank()) { "Workspace name cannot be blank" }

        val workspace = workspaceRepository.findByIdOrNull(command.id)
            ?: throw Exception("Workspace not found")

        workspace.name = Workspace.Name(command.name)
        workspace.ordering = command.ordering

        val result = workspaceRepository.save(workspace)
        val dto = result.toDTO()

        eventQueue.add(WorkspaceUpdatedEvent(dto))

        return dto
    }
}
