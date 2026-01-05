package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateScriptHandler(
    private val scriptRepository: ShellScriptRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val entityManager: EntityManager
) : CommandHandler<CreateScriptCommand, ShellScriptResponse> {

    override fun handle(eventQueue: EventQueue, command: CreateScriptCommand): ShellScriptResponse {

        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw Exception("Folder not found")

        val script = ShellScript(
            name = command.name,
            command = command.content,
            isMarkdown = false
        )

        val savedScript = scriptRepository.save(script)
        folder.addAndReorderScript(savedScript)
        entityManager.flush()
        entityManager.refresh(savedScript)

        val response = savedScript.toResponse()
        eventQueue.add(ScriptCreatedEvent(response))

        return response
    }
}

