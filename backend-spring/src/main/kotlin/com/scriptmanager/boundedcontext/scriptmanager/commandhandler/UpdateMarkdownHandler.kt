package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.UpdateMarkdownCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.MarkdownUpdatedEvent
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateMarkdownHandler(
    private val shellScriptRepository: ShellScriptRepository,
    private val entityManager: EntityManager
) : CommandHandler<UpdateMarkdownCommand, ShellScriptDTO> {
    override fun handle(eventQueue: EventQueue, command: UpdateMarkdownCommand): ShellScriptDTO {
        // No operation performed
        val markdownScript = shellScriptRepository.findByIdOrNull(command.scriptId)
            ?: throw ScriptManagerException("Script not found")

        markdownScript.name = command.name
        markdownScript.command = command.content
        val savedScript = shellScriptRepository.save(markdownScript)
        entityManager.flush()
        eventQueue.add(
            MarkdownUpdatedEvent(
                scriptId = savedScript.id!!,
                content = savedScript.command
            )
        )
        return savedScript.toDTO()
    }

}