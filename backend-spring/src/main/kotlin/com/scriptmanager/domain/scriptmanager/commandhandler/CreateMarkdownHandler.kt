package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.script.CreateMarkdownCommand
import com.scriptmanager.domain.scriptmanager.event.MarkdownCreatedEvent
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component


@Component
class CreateMarkdownHandler(
    private val folderRepository: ScriptsFolderRepository,
    private val scriptRepository: ShellScriptRepository,
    private val entityManager: EntityManager
) : CommandHandler<CreateMarkdownCommand, ShellScriptResponse> {

    override fun handle(eventQueue: EventQueue, command: CreateMarkdownCommand): ShellScriptResponse {

        val folder = folderRepository.findByIdOrNull(command.folderId)
            ?: throw Exception("Folder not found")

        val script = ShellScript(
            name = command.name,
            command = command.content,
            isMarkdown = true
        )

        val savedScript = scriptRepository.save(script)
        savedScript.ordering = -1
        folder.addAndReorderScript(savedScript)
        folder.resetScriptOrders()
        folderRepository.save(folder)
        entityManager.flush()
        entityManager.refresh(savedScript)

        val response = savedScript.toResponse()

        eventQueue.add(
            MarkdownCreatedEvent(
                scriptId = response.id!!,
                content = response.command
            )
        )

        return response
    }
}