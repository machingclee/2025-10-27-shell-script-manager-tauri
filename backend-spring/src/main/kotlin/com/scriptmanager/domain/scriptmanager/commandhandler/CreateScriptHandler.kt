package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateScriptCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateScriptHandler(
    private val scriptRepository: ShellScriptRepository,
    private val folderRepository: ScriptsFolderRepository
) : CommandHandler<CreateScriptCommand, ShellScriptResponse> {

    override fun handle(eventQueue: EventQueue, command: CreateScriptCommand): ShellScriptResponse {
        // Verify folder exists
        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw Exception("Folder not found")

        // Get count of scripts in folder to determine ordering
        val count = scriptRepository.findByFolderId(command.folderId).size

        // Create script with ordering
        val script = ShellScript(
            name = command.name,
            command = command.content,
            ordering = count,
        )

        val savedScript = scriptRepository.save(script)
        folder.addScript(savedScript)

        val response = savedScript.toResponse()
        eventQueue.add(ScriptCreatedEvent(response))

        return response
    }
}

