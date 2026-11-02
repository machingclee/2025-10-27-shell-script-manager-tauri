package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.DeleteTagCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagDeletedEvent
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteTagHandler(
    private val tagRepository: TagRepository
) : CommandHandler<DeleteTagCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteTagCommand) {
        val tag = tagRepository.findByIdOrNull(command.tagId)
            ?: throw ScriptManagerException("Tag not found")
        val dto = tag.toDTO()
        tagRepository.delete(tag)
        eventQueue.add(TagDeletedEvent(dto))
    }
}
