package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.DeleteFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderDeletedEvent
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptDeletedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<DeleteFolderCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteFolderCommand) {
        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw ScriptManagerException("Folder not found")
        val folderDTOToDelete = folder.toDTO()

        val parentFolder = folder.parentFolder
        val subfolderDTOs = folder.getAllSubfolders().map { it.toDTO() }
        val scriptsWithFolder = folder.getAllShellScripts().map { Pair(it.folder, it.script) }

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
            parentFolder.removeAndReorderFolders(folder)
            folderRepository.deleteById(folder.id!!)
        }

        val events = listOf(FolderDeletedEvent(folderDTOToDelete)) +
                subfolderDTOs.map { FolderDeletedEvent(it) } +
                scriptsWithFolder.map {
                    ScriptDeletedEvent(
                        folderId = it.first.id!!,
                        script = it.second.toDTO()
                    )
                }

        eventQueue.addAll(events)
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        FolderDeletedEvent::class.java,
        ScriptDeletedEvent::class.java
    )
}
