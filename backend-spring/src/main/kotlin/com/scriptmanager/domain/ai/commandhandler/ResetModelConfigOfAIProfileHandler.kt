package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.aiprofile.ResetModelConfigOfAIProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileModelConfigResetEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class ResetModelConfigOfAIProfileHandler(
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<ResetModelConfigOfAIProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: ResetModelConfigOfAIProfileCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        // Use domain behavior to reset the selected model config
        aiProfile.resetSelectedModelConfig()
        aiProfileRepository.save(aiProfile)

        // Emit event with the new selected model config (or null if none available)
        eventQueue.add(
            AiProfileModelConfigResetEvent(
                aiProfileId = command.aiProfileId,
                newSelectedModelConfigId = aiProfile.selectedModelConfigId
            )
        )
    }
}

