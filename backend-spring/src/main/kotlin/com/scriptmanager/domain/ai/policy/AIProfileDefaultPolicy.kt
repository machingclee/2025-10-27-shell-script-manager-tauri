package com.scriptmanager.domain.ai.policy

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.aiprofile.ResetModelConfigOfAIProfileCommand
import com.scriptmanager.domain.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.domain.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileCreatedEvent
import com.scriptmanager.domain.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.domain.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component


@Component
class AIProfileDefaultPolicy(
    private val aiProfileRepository: AIProfileRepository,
    private val applicationStateRepository: ApplicationStateRepository,
    private val commandInvoker: CommandInvoker
) {


    @EventListener
    fun applicationStateShouldSelectNewlyCreatedAIProfile(event: AiProfileCreatedEvent) {
        val applicationState = applicationStateRepository.findAll().first()
        if (applicationState.selectedAiProfile == null) {
            val createdProfileId = event.aiprofile.id!!
            val command = SelectDefaultAiProfileCommand(aiProfileId = createdProfileId)
            commandInvoker.invoke(command)
        }
    }

    @EventListener
    fun resetDefaultModelConfigInAIProfileUponModelConfigDeletion(event: ModelConfigDeletedEvent) {
        // since multiple config can be assigned to a profile, and only one can be active
        val (deleteBaseModelConfigId, aiProfileId) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(aiProfileId)
            ?: throw AIException("AI Profile with id $aiProfileId not found")
        aiProfile.selectedModelConfig?.let {
            if (it.id == deleteBaseModelConfigId) {
                val command = ResetModelConfigOfAIProfileCommand(aiProfileId = aiProfileId)
                commandInvoker.invoke(command)
            }
        }
    }


    @EventListener
    fun profileShouldSelectNewlyCreatedModelConfig(event: ModelConfigCreatedEvent) {
        val (parentAIProfileId, modelConfigDTO) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(parentAIProfileId)
            ?: throw AIException("AI Profile with id $parentAIProfileId not found")
        // only assign a new default model config (openai, azure openai, etc) when there is none in the profile
        if (aiProfile.selectedModelConfig == null) {
            val command = SelectAiProfileDefaultModelConfigCommand(
                aiProfileId = parentAIProfileId,
                modelConfigId = modelConfigDTO.id!!
            )
            commandInvoker.invoke(command)
        }
    }
}

