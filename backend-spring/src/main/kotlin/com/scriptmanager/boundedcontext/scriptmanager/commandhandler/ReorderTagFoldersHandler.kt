package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.tag.ReorderTagFoldersCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagFoldersReorderedEvent
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.stereotype.Component

@Component
class ReorderTagFoldersHandler(
    private val tagFolderRepository: TagFolderRepository
) : CommandHandler<ReorderTagFoldersCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderTagFoldersCommand) {
        val folders = tagFolderRepository.findAllOrderByOrdering().toMutableList()
        if (command.fromIndex < 0 || command.fromIndex >= folders.size ||
            command.toIndex < 0 || command.toIndex >= folders.size
        ) {
            throw ScriptManagerException("Invalid indices")
        }

        val moved = folders.removeAt(command.fromIndex)
        folders.add(command.toIndex, moved)
        folders.forEachIndexed { index, folder ->
            folder.ordering = index
        }
        tagFolderRepository.saveAll(folders)
        eventQueue.add(
            TagFoldersReorderedEvent(
                fromIndex = command.fromIndex,
                toIndex = command.toIndex
            )
        )
    }
}
