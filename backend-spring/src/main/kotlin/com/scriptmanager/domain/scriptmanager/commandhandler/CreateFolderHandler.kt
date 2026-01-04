package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.event.FolderCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.stereotype.Component

@Component
class CreateFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<CreateFolderCommand, ScriptsFolder> {

    override fun handle(eventQueue: EventQueue, command: CreateFolderCommand): ScriptsFolder {
        // Get count of folders to determine ordering
        val count = folderRepository.findAll().size

        // Create folder with ordering
        val newFolder = ScriptsFolder(
            name = command.name,
            ordering = count
        )

        val savedFolder = folderRepository.save(newFolder)

        eventQueue.add(FolderCreatedEvent(savedFolder.toDTO()))

        return savedFolder
    }
}

