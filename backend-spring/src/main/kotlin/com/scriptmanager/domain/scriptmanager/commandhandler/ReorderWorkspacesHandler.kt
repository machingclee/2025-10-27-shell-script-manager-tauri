package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.workspace.ReorderWorkspacesCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspacesReorderedEvent
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.stereotype.Component

@Component
class ReorderWorkspacesHandler(
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<ReorderWorkspacesCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderWorkspacesCommand) {
        val workspaces = workspaceRepository.findAll().sortedBy { it.ordering }

        // Validate indices
        if (command.fromIndex < 0 || command.fromIndex >= workspaces.size ||
            command.toIndex < 0 || command.toIndex >= workspaces.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder the workspaces
        val movedWorkspace = workspaces[command.fromIndex]
        val reordered = workspaces.toMutableList()
        reordered.removeAt(command.fromIndex)
        reordered.add(command.toIndex, movedWorkspace)

        // Update ordering values
        reordered.forEachIndexed { index, workspace ->
            workspace.ordering = index
        }
        workspaceRepository.saveAll(reordered)

        eventQueue.add(
            WorkspacesReorderedEvent(
                fromIndex = command.fromIndex,
                toIndex = command.toIndex
            )
        )
    }
}

