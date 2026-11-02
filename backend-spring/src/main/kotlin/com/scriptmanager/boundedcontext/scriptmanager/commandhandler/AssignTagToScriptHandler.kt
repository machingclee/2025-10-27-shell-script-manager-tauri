package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.AssignTagToScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.TagAssignedToScriptEvent
import com.scriptmanager.common.entity.AssignedTag
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ShellScriptRepository
import com.scriptmanager.repository.TagRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class AssignTagToScriptHandler(
    private val scriptRepository: ShellScriptRepository,
    private val tagRepository: TagRepository,
    private val entityManager: EntityManager
) : CommandHandler<AssignTagToScriptCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: AssignTagToScriptCommand) {
        val script = scriptRepository.findByIdOrNull(command.scriptId)
            ?: throw ScriptManagerException("Script not found")
        val tag = tagRepository.findByIdOrNull(command.tagId)
            ?: throw ScriptManagerException("Tag not found")
        if (script.assignedTags.any { it.tagId == tag.id }) {
            throw ScriptManagerException("Tag already assigned")
        }

        val assigned = AssignedTag(tagId = tag.id!!)
        assigned.tag = tag
        script.assignedTags.add(assigned)
        entityManager.flush()

        eventQueue.add(
            TagAssignedToScriptEvent(
                scriptId = command.scriptId,
                tagId = command.tagId,
                assignedTagId = assigned.id ?: 0
            )
        )
    }
}
