package com.scriptmanager.boundedcontext.ai.policy

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.aiprofile.ResetModelConfigOfAIProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileCreatedEvent
import com.scriptmanager.boundedcontext.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.boundedcontext.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.Invariant
import com.scriptmanager.common.domainutils.NextCommand
import com.scriptmanager.common.domainutils.Policy
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

    @EventListener
    @Invariant("When created, and when there is no default selected profile, the newly created profile should be set to default profile")
    @NextCommand(SelectDefaultAiProfileCommand::class)
    fun applicationStateShouldSelectNewlyCreatedAIProfile(event: AiProfileCreatedEvent) {
        val applicationState = applicationStateRepository.findAll().first()
        if (applicationState.selectedAiProfile == null) {
            val createdProfileId = event.aiprofile.id!!
            val command = SelectDefaultAiProfileCommand(aiProfileId = createdProfileId)
            commandInvoker.invoke(command)
        }
    }

    @EventListener
    @Invariant("When a config gets deleted, reset the default ai profile by using an existing config")
    @NextCommand(ResetModelConfigOfAIProfileCommand::class)
    fun resetDefaultModelConfigInAIProfileUponModelConfigDeletion(event: ModelConfigDeletedEvent) {
        val (deleteBaseModelConfigId, aiProfileId) = event
        val command = ResetModelConfigOfAIProfileCommand(aiProfileId = aiProfileId)
        commandInvoker.invoke(command)
    }

    @EventListener
    @Invariant("For each aiprofile, any newly created modelconfig should be selected automatically")
    @NextCommand(SelectAiProfileDefaultModelConfigCommand::class)
    fun profileShouldSelectNewlyCreatedModelConfig(event: ModelConfigCreatedEvent) {
        val (parentAIProfileId, modelConfigDTO) = event
        val aiProfile = aiProfileRepository.findByIdOrNull(parentAIProfileId)
            ?: throw AIException("AI Profile with id $parentAIProfileId not found")
        if (aiProfile.selectedModelConfig == null) {
            val command = SelectAiProfileDefaultModelConfigCommand(
                aiProfileId = parentAIProfileId,
                modelConfigId = modelConfigDTO.id!!
            )
            commandInvoker.invoke(command)
        }
    }
}

