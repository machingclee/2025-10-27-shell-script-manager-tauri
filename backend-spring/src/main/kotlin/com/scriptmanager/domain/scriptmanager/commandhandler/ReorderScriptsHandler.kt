package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.ReorderScriptsCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptsReorderedEvent
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.stereotype.Component

@Component
class ReorderScriptsHandler(
    private val scriptRepository: ShellScriptRepository
) : CommandHandler<ReorderScriptsCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderScriptsCommand) {
        val scripts = scriptRepository.findByFolderId(command.folderId).toMutableList()

        // Validate indices
        if (command.fromIndex < 0 || command.fromIndex >= scripts.size ||
            command.toIndex < 0 || command.toIndex >= scripts.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder in memory
        val movedScript = scripts.removeAt(command.fromIndex)
        scripts.add(command.toIndex, movedScript)

        // Update ordering values in database
        scripts.forEachIndexed { index, script ->
            script.ordering = index
        }

        eventQueue.add(
            ScriptsReorderedEvent(
                folderId = command.folderId,
                fromIndex = command.fromIndex,
                toIndex = command.toIndex
            )
        )
    }
}

