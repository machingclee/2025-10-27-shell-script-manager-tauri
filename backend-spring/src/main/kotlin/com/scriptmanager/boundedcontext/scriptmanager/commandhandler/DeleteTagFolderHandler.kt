package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.DeleteTagFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagFolderDeletedEvent
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteTagFolderHandler(
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<DeleteTagFolderCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteTagFolderCommand) {
        val tagFolder = tagFolderRepository.findByIdOrNull(command.tagFolderId)
            ?: throw ScriptManagerException("Tag folder not found")
        val dto = tagFolder.toDTO()
        tagFolderRepository.delete(tagFolder)
        val remaining = tagFolderRepository.findAllOrderByOrdering()
        remaining.forEachIndexed { index, folder ->
            folder.ordering = index
        }
        tagFolderRepository.saveAll(remaining)
        eventQueue.add(TagFolderDeletedEvent(dto))
    }
}
