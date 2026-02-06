package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.stereotype.Component

@Component
class CreateWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<CreateWorkspaceCommand, Workspace> {

    override fun handle(eventQueue: EventQueue, command: CreateWorkspaceCommand): Workspace {
        // Validate workspace name
        require(command.name.isNotBlank()) { "Workspace name cannot be blank" }

        // Get count of workspaces to determine ordering
        val count = workspaceRepository.findAll().size

        // Create workspace with ordering
        val newWorkspace = Workspace(
            name = Workspace.Name(command.name),
            ordering = count
        )

        val persistedWorkspace = workspaceRepository.save(newWorkspace)
        eventQueue.add(WorkspaceCreatedEvent(persistedWorkspace.toDTO()))

        return persistedWorkspace
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        WorkspaceCreatedEvent::class.java
    )
}
