package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.domain.ai.event.AiProfileDefaultModelConfigSelectedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class SelectAiProfileDefaultModelConfigHandler(
    private val aiProfileRepository: AIProfileRepository,
    private val modelConfigRepository: ModelConfigRepository
) : CommandHandler<SelectAiProfileDefaultModelConfigCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: SelectAiProfileDefaultModelConfigCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw Exception("AI Profile with id ${command.aiProfileId} not found")

        val modelConfig = modelConfigRepository.findByIdOrNull(command.modelConfigId)
            ?: throw Exception("Model Config with id ${command.modelConfigId} not found")

        // Verify the model config belongs to this AI profile
        if (!aiProfile.modelConfigs.any { it.id == command.modelConfigId }) {
            throw Exception("Model Config with id ${command.modelConfigId} does not belong to AI Profile ${command.aiProfileId}")
        }

        aiProfile.selectedModelConfigId = command.modelConfigId
        aiProfileRepository.save(aiProfile)

        eventQueue.add(
            AiProfileDefaultModelConfigSelectedEvent(
                aiProfileId = command.aiProfileId,
                modelConfigId = command.modelConfigId
            )
        )
    }
}

