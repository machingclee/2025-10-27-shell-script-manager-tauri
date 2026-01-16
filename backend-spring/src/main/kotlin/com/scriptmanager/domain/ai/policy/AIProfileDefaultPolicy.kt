package com.scriptmanager.domain.ai.policy

import com.scriptmanager.domain.ai.command.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.domain.ai.command.SelectDefaultAiProfileCommand
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
    fun profileShouldSelectNewlyCreatedModelConfig(event: ModelConfigCreatedEvent) {
        val (parentAIProfileId, modelConfigDTO) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(parentAIProfileId)
            ?: throw Exception("AI Profile with id $parentAIProfileId not found")
        // only assign a new default model config (openai, azure openai, etc) when there is none in the profile
        if (aiProfile.selectedModelConfig == null) {
            val command = SelectAiProfileDefaultModelConfigCommand(
                aiProfileId = parentAIProfileId,
                modelConfigId = modelConfigDTO.id!!
            )
            commandInvoker.invoke(command)
        }
    }

    @EventListener
    fun profileShouldSelectNextModelConfigWhenDeleted(event: ModelConfigDeletedEvent) {
        val (deletedModelConfigId, aiProfileId) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(aiProfileId)
            ?: throw Exception("AI Profile with id $aiProfileId not found")

        // If the deleted model config was the selected one, select the next available one
        if (aiProfile.selectedModelConfigId == deletedModelConfigId) {
            val nextModelConfig = aiProfile.modelConfigs
                .sortedBy { it.createdAt }
                .firstOrNull()

            if (nextModelConfig != null) {
                val command = SelectAiProfileDefaultModelConfigCommand(
                    aiProfileId = aiProfileId,
                    modelConfigId = nextModelConfig.id!!
                )
                commandInvoker.invoke(command)
            }
        }
    }
}