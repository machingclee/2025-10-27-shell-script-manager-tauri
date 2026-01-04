package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.folder.UpdateFolderCommand
import com.scriptmanager.domain.scriptmanager.event.FolderUpdatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<UpdateFolderCommand, ScriptsFolderDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateFolderCommand): ScriptsFolderDTO {
        val folder = folderRepository.findByIdOrNull(command.id)
            ?: throw Exception("Folder not found")

        folder.name = command.name
        folder.ordering = command.ordering

        val result = folderRepository.save(folder)
        val dto = result.toDTO()

        eventQueue.add(FolderUpdatedEvent(dto))

        return dto
    }
}

