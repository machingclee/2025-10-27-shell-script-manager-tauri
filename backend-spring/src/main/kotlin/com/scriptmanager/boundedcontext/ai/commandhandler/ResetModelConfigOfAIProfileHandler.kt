package com.scriptmanager.boundedcontext.ai.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.ai.command.aiprofile.ResetModelConfigOfAIProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileModelConfigResetEvent
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.AIException
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
        val resettedModelConfig = aiProfile.resetSelectedModelConfig()
        aiProfileRepository.save(aiProfile)

        // Emit event with the new selected model config (or null if none available)
        eventQueue.add(
            AiProfileModelConfigResetEvent(
                aiProfileId = command.aiProfileId,
                newSelectedModelConfigDTO = resettedModelConfig?.toDTO()
            )
        )
    }

}
