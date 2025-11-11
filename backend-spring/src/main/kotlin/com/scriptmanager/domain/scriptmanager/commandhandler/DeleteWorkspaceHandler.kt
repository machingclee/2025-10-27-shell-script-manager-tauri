package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.DeleteWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceDeletedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteWorkspaceHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<DeleteWorkspaceCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteWorkspaceCommand) {
        val workspace = workspaceRepository.findByIdOrNull(command.id)
            ?: throw Exception("Workspace not found")

        workspaceRepository.deleteById(workspace.id!!)

        // Reorder remaining workspaces
        val remainingWorkspaces = workspaceRepository.findAll().sortedBy { it.ordering }
        remainingWorkspaces.forEachIndexed { index, w ->
            w.ordering = index
        }
        workspaceRepository.saveAll(remainingWorkspaces)

        eventQueue.add(WorkspaceDeletedEvent(command.id))
    }
}

