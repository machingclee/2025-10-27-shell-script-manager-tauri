package com.scriptmanager.boundedcontext.ai.policy

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.aiprofile.ResetModelConfigOfAIProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileCreatedEvent
import com.scriptmanager.boundedcontext.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.boundedcontext.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.Policy
import com.scriptmanager.common.domainutils.PolicyFlow
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
) : Policy {

    override fun declareflows(): List<PolicyFlow> = listOf(
        PolicyFlow(
            fromEvent = AiProfileCreatedEvent::class.java,
            toCommand = SelectDefaultAiProfileCommand::class.java
        ),
        PolicyFlow(
            fromEvent = ModelConfigDeletedEvent::class.java,
            toCommand = ResetModelConfigOfAIProfileCommand::class.java
        ),
        PolicyFlow(
            fromEvent = ModelConfigCreatedEvent::class.java,
            toCommand = SelectAiProfileDefaultModelConfigCommand::class.java
        )
    )

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
        val (_deleteBaseModelConfigId, aiProfileId) = event
        val command = ResetModelConfigOfAIProfileCommand(aiProfileId = aiProfileId)
        commandInvoker.invoke(command)
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



