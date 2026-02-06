package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.AddSubfolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.SubfolderAddedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class AddSubfolderHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val entityManager: EntityManager
) : CommandHandler<AddSubfolderCommand, ScriptsFolder> {

    override fun handle(eventQueue: EventQueue, command: AddSubfolderCommand): ScriptsFolder {
        val parentFolder = folderRepository.findByIdOrNull(command.parentFolderId)
            ?: throw ScriptManagerException("Parent folder not found")

        val newSubfolder = ScriptsFolder(
            name = command.name,
            ordering = -1
        )

        folderRepository.save(newSubfolder)

        parentFolder.addAndReorderFolders(newSubfolder)
        entityManager.flush()
        entityManager.refresh(newSubfolder)

        eventQueue.add(
            SubfolderAddedEvent(
                parentFolderId = command.parentFolderId,
                subfolder = newSubfolder.toDTO()
            )
        )

        return newSubfolder
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        SubfolderAddedEvent::class.java
    )
}
