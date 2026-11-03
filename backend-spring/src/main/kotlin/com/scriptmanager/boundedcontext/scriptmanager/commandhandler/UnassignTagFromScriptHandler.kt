package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.UnassignTagFromScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagUnassignedFromScriptEvent
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UnassignTagFromScriptHandler(
    private val scriptRepository: ShellScriptRepository,
    private val entityManager: EntityManager
) : CommandHandler<UnassignTagFromScriptCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: UnassignTagFromScriptCommand) {
        val tagIds = command.tagIds.distinct()
        require(tagIds.isNotEmpty()) { "No tags selected" }

        val script = scriptRepository.findByIdOrNull(command.scriptId)
            ?: throw ScriptManagerException("Script not found")
        val rows = tagIds.map { tagId ->
            script.assignedTags.find { it.tagId == tagId }
                ?: throw ScriptManagerException("Tag is not assigned")
        }

        val removed = rows.map { row ->
            script.assignedTags.remove(row)
            val assignedTagId = row.id ?: 0
            val tagId = row.tagId
            entityManager.remove(row)
            tagId to assignedTagId
        }
        entityManager.flush()

        removed.forEach { (tagId, assignedTagId) ->
            eventQueue.add(
                TagUnassignedFromScriptEvent(
                    scriptId = command.scriptId,
                    tagId = tagId,
                    assignedTagId = assignedTagId
                )
            )
        }
    }
}
