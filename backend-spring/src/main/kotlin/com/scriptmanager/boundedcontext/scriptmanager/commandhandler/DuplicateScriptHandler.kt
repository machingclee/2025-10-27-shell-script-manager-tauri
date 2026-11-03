package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.DuplicateScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptDuplicatedEvent
import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DuplicateScriptHandler(
    private val scriptRepository: ShellScriptRepository,
    private val entityManager: EntityManager
) : CommandHandler<DuplicateScriptCommand, ShellScriptResponse> {

    override fun handle(eventQueue: EventQueue, command: DuplicateScriptCommand): ShellScriptResponse {
        val source = scriptRepository.findByIdOrNull(command.scriptId)
            ?: throw ScriptManagerException("Script not found")

        val folder = source.parentFolder
            ?: throw ScriptManagerException("Script is not in a folder")

        val copy = ShellScript(
            name = nextCopyName(source.name, folder.shellScripts.map { it.name }.toSet()),
            command = source.command,
            showShell = source.showShell,
            locked = false,
            isMarkdown = source.isMarkdown
        )

        val saved = scriptRepository.save(copy)
        folder.addDuplicateBefore(source, saved)
        entityManager.flush()
        entityManager.refresh(saved)

        val response = saved.toResponse()
        eventQueue.add(
            ScriptDuplicatedEvent(
                sourceScriptId = command.scriptId,
                script = response
            )
        )
        return response
    }

    private fun nextCopyName(originalName: String, siblingNames: Set<String>): String {
        fun clip(value: String) = value.take(NAME_MAX_LENGTH)
        val base = clip("$originalName copy")
        if (base !in siblingNames) return base
        var n = 2
        while (n < 1000) {
            val candidate = clip("$base $n")
            if (candidate !in siblingNames) return candidate
            n++
        }
        return clip("$base ${System.currentTimeMillis()}")
    }

    companion object {
        private const val NAME_MAX_LENGTH = 255
    }
}
