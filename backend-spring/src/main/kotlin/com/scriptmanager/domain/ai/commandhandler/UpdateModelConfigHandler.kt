package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.OpenAiModelConfig
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.modelconfig.UpdateModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigUpdatedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AzureOpenAIModelConfigRepository
import com.scriptmanager.repository.ModelConfigRepository
import com.scriptmanager.repository.OpenAIModelConfigRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateModelConfigHandler(
    private val modelConfigRepository: ModelConfigRepository,
    private val openAIModelConfigRepository: OpenAIModelConfigRepository,
    private val azureOpenAIModelConfigRepository: AzureOpenAIModelConfigRepository,
    private val entityManager: EntityManager
) : CommandHandler<UpdateModelConfigCommand, ModelConfig> {

    override fun handle(eventQueue: EventQueue, command: UpdateModelConfigCommand): ModelConfig {
        val modelConfigDto = command.modelConfigDTO
        val modelConfig = modelConfigRepository.findByIdOrNull(modelConfigDto.id)
            ?: throw AIException("Model Config with id ${modelConfigDto.id} not found")

        // Update ModelConfig
        modelConfig.name = modelConfigDto.name
        modelConfig.modelSource.type = when (modelConfigDto.modelSource) {
            ModelConfig.ModelSourceType.OPENAI -> ModelConfig.ModelSourceType.OPENAI
            ModelConfig.ModelSourceType.AZURE_OPENAI -> ModelConfig.ModelSourceType.AZURE_OPENAI
        }

        modelConfigRepository.save(modelConfig)

        // Update OpenAI config if provided
        command.openAiModelConfigDTO?.let { openAiDto ->
            val openAiConfig = modelConfig.openAiModelConfig

            if (openAiConfig != null) {
                openAiConfig.openaiApiKey = openAiDto.openaiApiKey
                openAiConfig.openaiModel = openAiDto.openaiModel
                openAIModelConfigRepository.save(openAiConfig)
            } else {
                val newOpenAiConfig = OpenAiModelConfig(
                    openaiApiKey = openAiDto.openaiApiKey,
                    openaiModel = openAiDto.openaiModel,
                    modelConfigId = modelConfigDto.id
                )
                modelConfig.openAiModelConfig = newOpenAiConfig
                openAIModelConfigRepository.save(newOpenAiConfig)
            }
        }

        // Update Azure config if provided
        command.azureModelConfigDTO?.let { azureDto ->
            val azureOpenAiConfig = modelConfig.azureModelConfig

            if (azureOpenAiConfig != null) {
                azureOpenAiConfig.azureOpenaiApiKey = azureDto.azureOpenaiApiKey
                azureOpenAiConfig.azureOpenaiEndpoint = azureDto.azureOpenaiEndpoint
                azureOpenAiConfig.azureOpenaiApiVersion = azureDto.azureOpenaiApiVersion
                azureOpenAiConfig.azureOpenaiModel = azureDto.azureOpenaiModel
                azureOpenAIModelConfigRepository.save(azureOpenAiConfig)
            } else {
                val newAzureConfig = com.scriptmanager.common.entity.AzureModelConfig(
                    azureOpenaiApiKey = azureDto.azureOpenaiApiKey,
                    azureOpenaiEndpoint = azureDto.azureOpenaiEndpoint,
                    azureOpenaiApiVersion = azureDto.azureOpenaiApiVersion,
                    azureOpenaiModel = azureDto.azureOpenaiModel,
                    modelConfigId = modelConfigDto.id!!
                )
                modelConfig.azureModelConfig = newAzureConfig
                azureOpenAIModelConfigRepository.save(newAzureConfig)
            }

            // unlink the remaining configs
            modelConfig.openAiModelConfig = null
        }

        entityManager.flush()
        entityManager.refresh(modelConfig)

        eventQueue.add(ModelConfigUpdatedEvent(modelConfigDTO = modelConfig.toDTO()))

        return modelConfig
    }
}

