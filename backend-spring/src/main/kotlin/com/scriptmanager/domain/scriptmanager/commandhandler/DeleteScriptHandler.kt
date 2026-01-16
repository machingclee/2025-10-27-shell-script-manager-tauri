package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
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
        val script = scriptRepository.findByIdOrNull(command.scriptId)
            ?: throw ScriptManagerException("Script not found")
        val scriptToDeleteDTO = script.toDTO()
        val parentFolder = script.parentFolder

        // Delete the script (cascade will handle relationship)
        if (parentFolder == null) {
            // this case is not possible, but just place a logic here
            scriptRepository.deleteById(command.scriptId)
        } else {
            parentFolder.removeAndReorderScripts(script)
            scriptRepository.deleteById(command.scriptId)
        }

        eventQueue.add(
            ScriptDeletedEvent(
                folderId = command.folderId,
                script = scriptToDeleteDTO
            )
        )
    }
}

