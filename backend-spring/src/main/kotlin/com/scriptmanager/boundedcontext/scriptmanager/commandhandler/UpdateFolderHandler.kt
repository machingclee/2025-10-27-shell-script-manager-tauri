package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.UpdateFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.FolderUpdatedEvent
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateFolderHandler(
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<UpdateFolderCommand, ScriptsFolderDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateFolderCommand): ScriptsFolderDTO {
        val folder = folderRepository.findByIdOrNull(command.id)
            ?: throw ScriptManagerException("Folder not found")

        folder.name = command.name
        folder.ordering = command.ordering

        val result = folderRepository.save(folder)
        val dto = result.toDTO()

        eventQueue.add(FolderUpdatedEvent(dto))

        return dto
    }

}
