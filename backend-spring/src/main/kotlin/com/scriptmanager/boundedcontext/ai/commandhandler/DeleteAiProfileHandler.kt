package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.aiprofile.DeleteAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileDeletedEvent
import com.scriptmanager.boundedcontext.ai.event.AiScriptedToolDeletedEvent
import com.scriptmanager.boundedcontext.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteAiProfileHandler(
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<DeleteAiProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteAiProfileCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

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

    override fun declareEvents(): List<Class<*>> = listOf(
        AiProfileDeletedEvent::class.java,
        ModelConfigDeletedEvent::class.java,
        AiScriptedToolDeletedEvent::class.java
    )
}
