package com.scriptmanager.integration.domain.ai.modelconfig

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.AzureModelConfigDTO
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.common.entity.OpenAiModelConfigDTO
import com.scriptmanager.domain.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.domain.ai.command.modelconfig.UpdateModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigUpdatedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class UpdateModelConfigCommandTest(
    private val eventRepository: EventRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should update model config name`() {
        // Arrange - Create profile and model config
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val original = commandInvoker.invoke(
            CreateModelConfigCommand("Original_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )

        val updatedName = "Updated_${System.currentTimeMillis()}"

        // Act - Update model config
        val result = commandInvoker.invoke(
            UpdateModelConfigCommand(
                modelConfigDTO = ModelConfigDTO(
                    id = original.id!!,
                    name = updatedName,
                    modelSource = original.modelSource.type,
                    createdAt = original.createdAt,
                    createdAtHk = original.createdAtHk
                ),
                openAiModelConfigDTO = null,
                azureModelConfigDTO = null
            )
        )

        // Assert - Command result
        assertEquals(original.id, result.id)
        assertEquals(updatedName, result.name)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigUpdatedEvent" }
        assertEquals(1, events.size, "Should emit ModelConfigUpdatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<ModelConfigUpdatedEvent>(events.first().payload)
        assertEquals(updatedName, payload.modelConfigDTO.name)

        // Assert - Persistence
        val saved = modelConfigRepository.findById(original.id!!).orElse(null)
        assertNotNull(saved)
        assertEquals(updatedName, saved.name)
    }

    @Test
    fun `should update model config with OpenAI config`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Config_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )

        // Act - Update with OpenAI config
        val result = commandInvoker.invoke(
            UpdateModelConfigCommand(
                modelConfigDTO = ModelConfigDTO(
                    id = modelConfig.id!!,
                    name = modelConfig.name,
                    modelSource = modelConfig.modelSource.type,
                    createdAt = modelConfig.createdAt,
                    createdAtHk = modelConfig.createdAtHk
                ),
                openAiModelConfigDTO = OpenAiModelConfigDTO(
                    id = 1,
                    openaiApiKey = "sk-test-key",
                    openaiModel = "gpt-4",
                    createdAt = null,
                    createdAtHk = null,
                    modelConfigId = modelConfig.id
                ),
                azureModelConfigDTO = null
            )
        )

        // Assert
        assertNotNull(result)
    }

    @Test
    fun `should update model config with Azure config`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Config_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.AZURE_OPENAI, profile.id!!)
        )

        // Act - Update with Azure config
        val result = commandInvoker.invoke(
            UpdateModelConfigCommand(
                modelConfigDTO = ModelConfigDTO(
                    id = modelConfig.id!!,
                    name = modelConfig.name,
                    modelSource = modelConfig.modelSource.type,
                    createdAt = modelConfig.createdAt,
                    createdAtHk = modelConfig.createdAtHk
                ),
                openAiModelConfigDTO = null,
                azureModelConfigDTO = AzureModelConfigDTO(
                    id = 1,
                    azureOpenaiApiKey = "azure-key",
                    azureOpenaiEndpoint = "https://test.openai.azure.com",
                    azureOpenaiApiVersion = "2024-01-01",
                    azureOpenaiModel = "gpt-4",
                    createdAt = null,
                    createdAtHk = null,
                    modelConfigId = modelConfig.id!!
                )
            )
        )

        // Assert
        assertNotNull(result)
    }

    @Test
    fun `should throw error when updating non-existent model config`() {
        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                UpdateModelConfigCommand(
                    modelConfigDTO = ModelConfigDTO(
                        id = 99999,
                        name = "NonExistent",
                        modelSource = ModelConfig.ModelSourceType.OPENAI,
                        createdAt = null,
                        createdAtHk = null
                    ),
                    openAiModelConfigDTO = null,
                    azureModelConfigDTO = null
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("Model Config with id 99999 not found"))
    }
}

