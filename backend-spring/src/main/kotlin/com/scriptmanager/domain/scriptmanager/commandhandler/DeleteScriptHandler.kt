package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.script.DeleteScriptCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptDeletedEvent
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteScriptHandler(
    private val scriptRepository: ShellScriptRepository
) : CommandHandler<DeleteScriptCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteScriptCommand) {
        val script = scriptRepository.findByIdOrNull(command.id)
            ?: throw Exception("Script not found")

        // Delete the script (cascade will handle relationship)
        scriptRepository.deleteById(command.id)

        // Reorder remaining scripts in the folder
        val remainingScripts = scriptRepository.findByFolderId(command.folderId)
        remainingScripts.forEachIndexed { index, s ->
            s.ordering = index
        }
        scriptRepository.saveAll(remainingScripts)

        eventQueue.add(ScriptDeletedEvent(command.id, command.folderId))
    }
}

