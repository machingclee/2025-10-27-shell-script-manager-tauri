package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
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
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        val modelConfig = modelConfigRepository.findByIdOrNull(command.modelConfigId)
            ?: throw AIException("Model Config with id ${command.modelConfigId} not found")

        // Use domain behavior to select the model config (it will validate ownership)
        aiProfile.selectDefaultModelConfig(modelConfig)
        aiProfileRepository.save(aiProfile)

        eventQueue.add(
            AiProfileDefaultModelConfigSelectedEvent(
                aiProfileId = command.aiProfileId,
                modelConfigId = command.modelConfigId
            )
        )
    }
}

