package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.DeleteFolderCommand
import com.scriptmanager.domain.scriptmanager.event.FolderDeletedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<DeleteFolderCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteFolderCommand) {
        val folder = folderRepository.findByIdOrNull(command.id)
            ?: throw Exception("Folder not found")

        val parentFolder = folder.parentFolder

        if (parentFolder == null) {
            // Root folder - delete and reorder
            folderRepository.deleteById(folder.id!!)

            // Reorder remaining folders
            val remainingFolders = folderRepository.findAllRootLevelFolder()
            remainingFolders.forEachIndexed { index, f ->
                f.ordering = index
            }
            folderRepository.saveAll(remainingFolders)
        } else {
            // Subfolder - remove from parent
            parentFolder.removeFolder(folder)
        }

        eventQueue.add(FolderDeletedEvent(command.id))
    }
}

