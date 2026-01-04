package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.stereotype.Component

@Component
class CreateWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<CreateWorkspaceCommand, WorkspaceDTO> {

    override fun handle(eventQueue: EventQueue, command: CreateWorkspaceCommand): WorkspaceDTO {
        // Validate workspace name
        require(command.name.isNotBlank()) { "Workspace name cannot be blank" }

        // Get count of workspaces to determine ordering
        val count = workspaceRepository.findAll().size

        // Create workspace with ordering
        val newWorkspace = Workspace(
            name = Workspace.Name(command.name),
            ordering = count
        )

        val result = workspaceRepository.save(newWorkspace)
        val dto = result.toDTO()

        eventQueue.add(WorkspaceCreatedEvent(dto))

        return dto
    }
}
