package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.common.entity.*
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.AzureOpenAIModelConfigRepository
import com.scriptmanager.repository.ModelConfigRepository
import com.scriptmanager.repository.OpenAIModelConfigRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateModelConfigHandler(
    private val aiProfileRepository: AIProfileRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val entityManager: EntityManager,
    private val azureOpenAIModelConfigRepository: AzureOpenAIModelConfigRepository,
    private val openAIModelConfigRepository: OpenAIModelConfigRepository
) : CommandHandler<CreateModelConfigCommand, ModelConfig> {

    override fun handle(eventQueue: EventQueue, command: CreateModelConfigCommand): ModelConfig {
        val (name, modelSourceType, aiprofileId) = command
        val aiProfile = aiProfileRepository.findByIdOrNull(aiprofileId)
            ?: throw AIException("AI Profile with id $aiprofileId not found")

        val modelConfig = ModelConfig(
            name = name,
            modelSource = ModelConfig.ModelSource(modelSourceType),
        )

        modelConfigRepository.save(modelConfig)

        when (modelSourceType) {
            ModelConfig.ModelSourceType.OPENAI -> {
                val openAIModelConfig = OpenAiModelConfig(modelConfigId = modelConfig.id!!)
                openAIModelConfigRepository.save(openAIModelConfig)
            }

            ModelConfig.ModelSourceType.AZURE_OPENAI -> {
                val azureOpenAIModelConfig = AzureModelConfig(
                    modelConfigId = modelConfig.id!!
                )
                azureOpenAIModelConfigRepository.save(azureOpenAIModelConfig)
            }
        }

        aiProfile.modelConfigs.add(modelConfig)
        aiProfileRepository.save(aiProfile)
        entityManager.flush()
        entityManager.refresh(modelConfig)
        eventQueue.add(
            ModelConfigCreatedEvent(
                parentAIProfileId = aiprofileId,
                modelConfigDTO = modelConfig.toDTO()
            )
        )

        return modelConfig
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        ModelConfigCreatedEvent::class.java
    )
}