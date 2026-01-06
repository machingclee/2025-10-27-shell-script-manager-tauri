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
        val parentFolder = script.parentFolder

        // Delete the script (cascade will handle relationship)
        if (parentFolder == null) {
            // this case is not possible, but just place a logic here
            scriptRepository.deleteById(command.id)
        } else {
            parentFolder.removeAndReorderScripts(script)
            scriptRepository.deleteById(command.id)
        }

        eventQueue.add(ScriptDeletedEvent(command.id, command.folderId))
    }
}

