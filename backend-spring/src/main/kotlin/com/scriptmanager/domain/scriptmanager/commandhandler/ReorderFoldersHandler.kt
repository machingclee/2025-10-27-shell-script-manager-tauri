package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.workspace.ReorderFoldersCommand
import com.scriptmanager.domain.scriptmanager.event.FoldersReorderedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class ReorderFoldersHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository
) : CommandHandler<ReorderFoldersCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderFoldersCommand) {
        val parentFolderId = command.parentFolderId
        val parentWorkspaceId = command.parentWorkspaceId

        if (parentFolderId == null && (parentWorkspaceId == null || parentWorkspaceId == 0)) {
            // Reorder root-level folders
            val folders = folderRepository.findAllRootLevelFolder()

            // Validate indices
            if (command.fromIndex < 0 || command.fromIndex >= folders.size ||
                command.toIndex < 0 || command.toIndex >= folders.size
            ) {
                throw Exception("Invalid indices")
            }

            val movedFolder = folders[command.fromIndex]
            val reordered = folders.toMutableList()
            reordered.removeAt(command.fromIndex)
            reordered.add(command.toIndex, movedFolder)

            // Update ordering values
            reordered.forEachIndexed { index, folder ->
                folder.ordering = index
            }
            folderRepository.saveAll(reordered)
        } else if (parentWorkspaceId != null && parentWorkspaceId != 0) {
            val workspace = workspaceRepository.findByIdOrNull(parentWorkspaceId)
                ?: throw Exception("Workspace not found")
            val folders = workspace.folders.sortedBy { it.ordering }.toMutableList()

            // Validate indices for subfolders
            if (command.fromIndex < 0 || command.fromIndex >= folders.size ||
                command.toIndex < 0 || command.toIndex >= folders.size
            ) {
                throw Exception("Invalid indices for subfolders")
            }

            reorderFolders(command, folders)
            folderRepository.saveAll(folders)
        } else {
            // Reorder subfolders within the specified parent folder
            val parentFolder = folderRepository.findByIdOrNull(parentFolderId)
                ?: throw Exception("Parent folder not found")
            val subfolders = parentFolder.subfolders.sortedBy { it.ordering }.toMutableList()

            // Validate indices for subfolders
            reorderFolders(command, subfolders)
            folderRepository.saveAll(subfolders)
        }

        eventQueue.add(
            FoldersReorderedEvent(
                parentFolderId = parentFolderId,
                parentWorkspaceId = parentWorkspaceId,
                fromIndex = command.fromIndex,
                toIndex = command.toIndex
            )
        )
    }

    private fun reorderFolders(command: ReorderFoldersCommand, subfolders: MutableList<ScriptsFolder>) {
        if (command.fromIndex < 0 || command.fromIndex >= subfolders.size ||
            command.toIndex < 0 || command.toIndex >= subfolders.size
        ) {
            throw Exception("Invalid indices for subfolders")
        }

        val movedSubfolder = subfolders[command.fromIndex]
        subfolders.removeAt(command.fromIndex)
        subfolders.add(command.toIndex, movedSubfolder)
        subfolders.forEachIndexed { idx, folder ->
            folder.ordering = idx
        }
    }
}

