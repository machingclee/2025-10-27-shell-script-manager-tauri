package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.DeleteAiProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileDeletedEvent
import com.scriptmanager.domain.ai.event.AiScriptedToolDeletedEvent
import com.scriptmanager.domain.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteAiProfileHandler(
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<DeleteAiProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteAiProfileCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw Exception("AI Profile with id ${command.aiProfileId} not found")

        // Collect IDs before deletion for events
        val modelConfigIds = aiProfile.modelConfigs.map { it.id!! }
        val scriptedToolIds = aiProfile.aiScriptedTools.map { it.id!! }

        // Delete the AI Profile (cascade will handle related entities)
        aiProfileRepository.deleteById(command.aiProfileId)

        // Add events
        eventQueue.add(AiProfileDeletedEvent(aiProfileId = command.aiProfileId))

        // Add events for cascaded deletions
        modelConfigIds.forEach { modelConfigId ->
            eventQueue.add(
                ModelConfigDeletedEvent(
                    modelConfigId = modelConfigId,
                    aiProfileId = command.aiProfileId
                )
            )
        }

        scriptedToolIds.forEach { toolId ->
            eventQueue.add(
                AiScriptedToolDeletedEvent(
                    aiScriptedToolId = toolId,
                    aiProfileId = command.aiProfileId
                )
            )
        }
    }
}

