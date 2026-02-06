package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.DeleteAiScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.event.AiScriptedToolDeletedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.AIScriptedToolRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteAiScriptedToolHandler(
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<DeleteAiScriptedToolCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteAiScriptedToolCommand) {
        val aiScriptedTool = aiScriptedToolRepository.findByIdOrNull(command.aiScriptedToolId)
            ?: throw AIException("AI Scripted Tool with id ${command.aiScriptedToolId} not found")

        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        // Remove from AI Profile's collection
        aiProfile.aiScriptedTools.removeIf { it.id == command.aiScriptedToolId }
        aiProfileRepository.save(aiProfile)

        // Delete the scripted tool
        aiScriptedToolRepository.deleteById(command.aiScriptedToolId)

        eventQueue.add(
            AiScriptedToolDeletedEvent(
                aiScriptedToolId = command.aiScriptedToolId,
                aiProfileId = command.aiProfileId
            )
        )
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        AiScriptedToolDeletedEvent::class.java
    )
}
