package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.UpdateTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagUpdatedEvent
import com.scriptmanager.common.entity.TagDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import com.scriptmanager.repository.TagRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateTagHandler(
    private val tagRepository: TagRepository,
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<UpdateTagCommand, TagDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateTagCommand): TagDTO {
        val tag = tagRepository.findByIdOrNull(command.id)
            ?: throw ScriptManagerException("Tag not found")

        val name = command.name.trim()
        require(name.isNotBlank()) { "Tag name cannot be blank" }
        val existing = tagRepository.findByNameIgnoreCase(name)
        if (existing != null && existing.id != tag.id) {
            throw ScriptManagerException("Tag name already exists")
        }
        command.tagFolderId?.let { folderId ->
            tagFolderRepository.findByIdOrNull(folderId)
                ?: throw ScriptManagerException("Tag folder not found")
        }

        tag.name = name
        tag.tagFolderId = command.tagFolderId
        val dto = tagRepository.save(tag).toDTO()
        eventQueue.add(TagUpdatedEvent(dto))
        return dto
    }
}
