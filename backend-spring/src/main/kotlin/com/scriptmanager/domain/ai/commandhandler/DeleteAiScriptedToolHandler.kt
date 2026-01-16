package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.DeleteAiScriptedToolCommand
import com.scriptmanager.domain.ai.event.AiScriptedToolDeletedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
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
            ?: throw Exception("AI Scripted Tool with id ${command.aiScriptedToolId} not found")

        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw Exception("AI Profile with id ${command.aiProfileId} not found")

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
}

