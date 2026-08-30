package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.UpdateScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptUpdatedEvent
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateScriptHandler(
    private val scriptRepository: ShellScriptRepository
) : CommandHandler<UpdateScriptCommand, ShellScriptDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateScriptCommand): ShellScriptDTO {
        val script = scriptRepository.findByIdOrNull(command.id)
            ?: throw ScriptManagerException("Script not found")

        script.apply {
            name = command.name
            this.command = command.command
            showShell = command.showShell
            locked = command.locked
        }

        val dto = script.toDTO()
        eventQueue.add(ScriptUpdatedEvent(dto))

        return dto
    }

}
