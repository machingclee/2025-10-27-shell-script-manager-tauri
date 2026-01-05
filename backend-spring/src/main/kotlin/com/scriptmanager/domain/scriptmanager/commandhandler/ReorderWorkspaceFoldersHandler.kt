package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.workspace.ReorderWorkspaceFoldersCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceFoldersReorderedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class ReorderWorkspaceFoldersHandler(
    private val workspaceRepository: WorkspaceRepository,
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<ReorderWorkspaceFoldersCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderWorkspaceFoldersCommand) {
        val workspace = workspaceRepository.findByIdOrNull(command.workspaceId)
            ?: throw Exception("Workspace not found")

        val folders = workspace.folders.sortedBy { it.ordering }.toMutableList()

        // Validate indices
        if (command.fromIndex < 0 || command.fromIndex >= folders.size ||
            command.toIndex < 0 || command.toIndex >= folders.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder the folders
        val movedFolder = folders[command.fromIndex]
        folders.removeAt(command.fromIndex)
        folders.add(command.toIndex, movedFolder)

        // Update ordering values
        folders.forEachIndexed { index, folder ->
            folder.ordering = index
        }
        folderRepository.saveAll(folders)

        eventQueue.add(
            WorkspaceFoldersReorderedEvent(
                workspaceId = command.workspaceId,
                movedFolder = movedFolder.toDTO(),
                fromIndex = command.fromIndex,
                toIndex = command.toIndex
            )
        )
    }
}

