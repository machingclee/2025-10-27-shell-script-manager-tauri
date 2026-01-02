package com.scriptmanager.integration.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.ai.command.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.CreateModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for Model Configuration API endpoints
 * Maps to: POST /ai/model-config
 * Domain: com.scriptmanager.domain.ai
 */
@SpringBootTest
class ModelConfigTest(
    private val eventRepository: EventRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create model configuration via POST model-config`() {
        // Arrange - Create AI profile first (required)
        val aiProfile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Test profile")
        )

        val configName = "GPT4_Config_${System.currentTimeMillis()}"
        val modelSource = "OPENAI"

        // Act - Simulates POST /ai/model-config
        val result = commandInvoker.invoke(
            CreateModelConfigCommand(
                name = configName,
                modelSource = modelSource,
                aiprofileId = aiProfile.id!!
            )
        )

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(configName, result.name)
        assertEquals(modelSource, result.modelSource)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigCreatedEvent" }
        assertEquals(1, events.size, "Should emit ModelConfigCreatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload (note: field is 'modelConfigDTO')
        val payload = objectMapper.readValue<ModelConfigCreatedEvent>(events.first().payload)
        assertEquals(configName, payload.modelConfigDTO.name)

        // Assert - Persistence
        val saved = modelConfigRepository.findById(result.id!!).orElse(null)
        assertNotNull(saved)
        assertEquals(configName, saved.name)
    }

    @Test
    fun `should create multiple model configs for different providers`() {
        // Arrange - Create AI profile first
        val aiProfile = commandInvoker.invoke(
            CreateAiProfileCommand("SharedProfile_${System.currentTimeMillis()}", "Shared test profile")
        )

        // Act
        val openAiConfig = commandInvoker.invoke(
            CreateModelConfigCommand("OpenAI_${System.currentTimeMillis()}", "OPENAI", aiProfile.id!!)
        )

        val azureConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Azure_${System.currentTimeMillis()}", "AZURE_OPENAI", aiProfile.id!!)
        )

        // Assert
        assertNotEquals(openAiConfig.id, azureConfig.id)
        assertEquals("OPENAI", openAiConfig.modelSource)
        assertEquals("AZURE_OPENAI", azureConfig.modelSource)

        // Assert - Both events exist
        val events = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigCreatedEvent" }
        assertEquals(2, events.size)
    }

    @Test
    fun `should throw error for invalid model source`() {
        // Arrange - Create AI profile first
        val aiProfile = commandInvoker.invoke(
            CreateAiProfileCommand("InvalidSourceProfile_${System.currentTimeMillis()}", "Test profile")
        )

        // Act & Assert - Should throw IllegalArgumentException
        val exception = assertThrows(IllegalArgumentException::class.java) {
            commandInvoker.invoke(
                CreateModelConfigCommand(
                    name = "InvalidConfig_${System.currentTimeMillis()}",
                    modelSource = "AZURE", // Invalid - should be AZURE_OPENAI
                    aiprofileId = aiProfile.id!!
                )
            )
        }

        // Assert - Error message is correct
        assertTrue(exception.message!!.contains("Model source must be one of: OPENAI, AZURE_OPENAI"))

        // Assert - No event was emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigCreatedEvent" }
        assertEquals(0, events.size, "Should not emit event for invalid model source")
    }

    @Test
    fun `should throw error for completely invalid model source`() {
        // Arrange
        val aiProfile = commandInvoker.invoke(
            CreateAiProfileCommand("InvalidProfile2_${System.currentTimeMillis()}", "Test")
        )

        // Act & Assert
        val exception = assertThrows(IllegalArgumentException::class.java) {
            commandInvoker.invoke(
                CreateModelConfigCommand(
                    name = "Config_${System.currentTimeMillis()}",
                    modelSource = "INVALID_SOURCE",
                    aiprofileId = aiProfile.id!!
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("Model source must be one of: OPENAI, AZURE_OPENAI"))
    }
}

