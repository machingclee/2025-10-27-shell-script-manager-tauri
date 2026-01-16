package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.folder.AddSubfolderCommand
import com.scriptmanager.domain.scriptmanager.event.SubfolderAddedEvent
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
}

