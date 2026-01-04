package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.script.UpdateMarkdownCommand
import com.scriptmanager.domain.scriptmanager.event.MarkdownUpdatedEvent
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
            ?: throw Exception("Script not found")

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