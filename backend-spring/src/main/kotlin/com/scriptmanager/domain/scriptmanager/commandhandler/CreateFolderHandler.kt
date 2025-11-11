package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.event.FolderCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.stereotype.Component

@Component
class CreateFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<CreateFolderCommand, ScriptsFolderDTO> {

    override fun handle(eventQueue: EventQueue, command: CreateFolderCommand): ScriptsFolderDTO {
        // Get count of folders to determine ordering
        val count = folderRepository.findAll().size

        // Create folder with ordering
        val newFolder = ScriptsFolder(
            name = command.name,
            ordering = count
        )

        val result = folderRepository.save(newFolder)
        val dto = result.toDTO()

        eventQueue.add(FolderCreatedEvent(dto))

        return dto
    }
}

