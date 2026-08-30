package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.ReorderScriptsCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptsReorderedEvent
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.stereotype.Component

@Component
class ReorderScriptsHandler(
    private val scriptRepository: ShellScriptRepository
) : CommandHandler<ReorderScriptsCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ReorderScriptsCommand) {
        val scripts = if (command.folderId == null) {
            scriptRepository.findDraftScripts().toMutableList()
        } else {
            scriptRepository.findByFolderId(command.folderId).toMutableList()
        }

        // Validate indices
        if (command.fromIndex < 0 || command.fromIndex >= scripts.size ||
            command.toIndex < 0 || command.toIndex >= scripts.size
        ) {
            throw ScriptManagerException("Invalid indices")
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
