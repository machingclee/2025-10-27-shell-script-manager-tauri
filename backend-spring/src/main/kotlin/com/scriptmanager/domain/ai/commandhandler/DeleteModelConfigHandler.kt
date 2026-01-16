package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.DeleteModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteModelConfigHandler(
    private val modelConfigRepository: ModelConfigRepository,
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<DeleteModelConfigCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteModelConfigCommand) {
        val modelConfig = modelConfigRepository.findByIdOrNull(command.modelConfigId)
            ?: throw Exception("Model Config with id ${command.modelConfigId} not found")

        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw Exception("AI Profile with id ${command.aiProfileId} not found")

        // Remove from AI Profile's collection
        aiProfile.modelConfigs.removeIf { it.id == command.modelConfigId }

        // If this was the selected model config, clear the selection
        if (aiProfile.selectedModelConfigId == command.modelConfigId) {
            aiProfile.selectedModelConfigId = null
        }

        aiProfileRepository.save(aiProfile)

        // Delete the model config (cascade will handle OpenAI/Azure configs)
        modelConfigRepository.deleteById(command.modelConfigId)

        eventQueue.add(
            ModelConfigDeletedEvent(
                modelConfigId = command.modelConfigId,
                aiProfileId = command.aiProfileId
            )
        )
    }
}

