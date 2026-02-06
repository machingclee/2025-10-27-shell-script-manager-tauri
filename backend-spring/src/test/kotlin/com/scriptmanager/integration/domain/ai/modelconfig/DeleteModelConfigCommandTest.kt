package com.scriptmanager.integration.boundedcontext.ai.modelconfig

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.DeleteModelConfigCommand
import com.scriptmanager.boundedcontext.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.repository.findByIdOrNull

@SpringBootTest
class DeleteModelConfigCommandTest(
    private val eventRepository: EventRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should delete model config`() {
        // Arrange - Create profile and model config
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("ToDelete_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )

        // Act - Delete model config
        commandInvoker.invoke(
            DeleteModelConfigCommand(
                modelConfigId = modelConfig.id!!,
                aiProfileId = profile.id!!
            )
        )

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigDeletedEvent" }
        assertEquals(1, events.size, "Should emit ModelConfigDeletedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<ModelConfigDeletedEvent>(events.first().payload)
        assertEquals(modelConfig.id, payload.modelConfigId)
        assertEquals(profile.id, payload.aiProfileId)

        // Assert - Model config is deleted
        assertFalse(modelConfigRepository.existsById(modelConfig.id!!))
    }

    @Test
    fun `should clear selected model config when deleting selected config`() {
        // Arrange - Create profile with selected model config
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Selected_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.AZURE_OPENAI, profile.id!!)
        )

        // Manually set as selected (simulating selection)
        val savedProfile = aiProfileRepository.findByIdOrNull(profile.id) ?: throw AIException("Profile not found")
        savedProfile.selectedModelConfigId = modelConfig.id
        aiProfileRepository.save(savedProfile)

        // Act - Delete the selected config
        commandInvoker.invoke(
            DeleteModelConfigCommand(modelConfig.id!!, profile.id!!)
        )

        // Assert - Selected config is cleared
        val updatedProfile = aiProfileRepository.findByIdOrNull(profile.id) ?: throw AIException("Profile not found")
        assertNull(updatedProfile.selectedModelConfigId)
    }

    @Test
    fun `should auto-select next model config when deleting current selection`() {
        // Arrange - Create profile with multiple model configs
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val config1 = commandInvoker.invoke(
            CreateModelConfigCommand("Config1_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )
        Thread.sleep(10) // Ensure different timestamps
        val config2 = commandInvoker.invoke(
            CreateModelConfigCommand("Config2_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.AZURE_OPENAI, profile.id!!)
        )

        // Set first config as selected
        val savedProfile = aiProfileRepository.findByIdOrNull(profile.id!!) ?: throw AIException("Profile not found")
        savedProfile.selectedModelConfigId = config1.id
        aiProfileRepository.save(savedProfile)

        // Act - Delete the selected config
        commandInvoker.invoke(
            DeleteModelConfigCommand(config1.id!!, profile.id!!)
        )

        // Assert - Second config is auto-selected
        val updatedProfile = aiProfileRepository.findByIdOrNull(profile.id!!) ?: throw AIException("Profile not found")
        assertEquals(config2.id, updatedProfile.selectedModelConfigId)
    }

    @Test
    fun `should throw error when deleting non-existent model config`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                DeleteModelConfigCommand(99999, profile.id!!)
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("Model Config with id 99999 not found"))
    }
}

