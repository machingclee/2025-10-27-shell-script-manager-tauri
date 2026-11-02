package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.UpdateTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagFolderUpdatedEvent
import com.scriptmanager.common.entity.TagFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateTagFolderHandler(
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<UpdateTagFolderCommand, TagFolderDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateTagFolderCommand): TagFolderDTO {
        val tagFolder = tagFolderRepository.findByIdOrNull(command.id)
            ?: throw ScriptManagerException("Tag folder not found")

        val name = command.name.trim()
        require(name.isNotBlank()) { "Tag folder name cannot be blank" }

        tagFolder.name = name
        val dto = tagFolderRepository.save(tagFolder).toDTO()
        eventQueue.add(TagFolderUpdatedEvent(dto))
        return dto
    }
}
