package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.CreateTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagCreatedEvent
import com.scriptmanager.common.entity.Tag
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import com.scriptmanager.repository.TagRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateTagHandler(
    private val tagRepository: TagRepository,
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<CreateTagCommand, Tag> {

    override fun handle(eventQueue: EventQueue, command: CreateTagCommand): Tag {
        val name = command.name.trim()
        require(name.isNotBlank()) { "Tag name cannot be blank" }
        if (tagRepository.findByNameIgnoreCase(name) != null) {
            throw ScriptManagerException("Tag name already exists")
        }
        command.tagFolderId?.let { folderId ->
            tagFolderRepository.findByIdOrNull(folderId)
                ?: throw ScriptManagerException("Tag folder not found")
        }

        val saved = tagRepository.save(Tag(name = name, tagFolderId = command.tagFolderId))
        eventQueue.add(TagCreatedEvent(saved.toDTO()))
        return saved
    }
}
