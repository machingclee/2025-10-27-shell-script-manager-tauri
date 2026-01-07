package com.scriptmanager.domain.ai.policy

import com.scriptmanager.domain.ai.event.AiProfileCreatedEvent
import com.scriptmanager.domain.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component


@Component
class AIProfileDefaultPolicy(
    private val aiProfileRepository: AIProfileRepository,
    private val applicationStateRepository: ApplicationStateRepository
) {


    @EventListener
    fun applicationStateShouldSelectNewlyCreatedAIProfile(event: AiProfileCreatedEvent) {
        val applicationState = applicationStateRepository.findAll().first()
        if (applicationState.selectedAiProfile == null) {
            val createdProfileId = event.aiprofile.id!!
            applicationState.selectedAiProfileId = createdProfileId
        }
    }


    @EventListener
    fun profileShouldSelectNewlyCreatedModelConfig(event: ModelConfigCreatedEvent) {
        val (parentAIProfileId, modelConfigDTO) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(parentAIProfileId)
            ?: throw Exception("AI Profile with id $parentAIProfileId not found")
        // only assign a new default model config (openai, azure openai, etc) when there is none in the profile
        if (aiProfile.selectedModelConfig == null) {
            aiProfile.selectedModelConfigId = modelConfigDTO.id
        }
    }
}