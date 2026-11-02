package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.CreateTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagFolderCreatedEvent
import com.scriptmanager.common.entity.TagFolder
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.stereotype.Component

@Component
class CreateTagFolderHandler(
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<CreateTagFolderCommand, TagFolder> {

    override fun handle(eventQueue: EventQueue, command: CreateTagFolderCommand): TagFolder {
        val name = command.name.trim()
        require(name.isNotBlank()) { "Tag folder name cannot be blank" }

        val nextOrdering = (tagFolderRepository.findAllOrderByOrdering().maxOfOrNull { it.ordering } ?: -1) + 1
        val saved = tagFolderRepository.save(TagFolder(name = name, ordering = nextOrdering))
        eventQueue.add(TagFolderCreatedEvent(saved.toDTO()))
        return saved
    }
}
