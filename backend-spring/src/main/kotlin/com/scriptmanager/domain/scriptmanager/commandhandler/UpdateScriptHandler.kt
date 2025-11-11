package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.UpdateScriptCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptUpdatedEvent
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateScriptHandler(
    private val scriptRepository: ShellScriptRepository
) : CommandHandler<UpdateScriptCommand, ShellScriptDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateScriptCommand): ShellScriptDTO {
        val script = scriptRepository.findByIdOrNull(command.id)
            ?: throw Exception("Script not found")

        script.apply {
            name = command.name
            this.command = command.command
            showShell = command.showShell
        }

        val dto = script.toDTO()
        eventQueue.add(ScriptUpdatedEvent(dto))

        return dto
    }
}

