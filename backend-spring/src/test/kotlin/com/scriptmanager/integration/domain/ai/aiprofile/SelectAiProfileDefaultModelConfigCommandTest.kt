package com.scriptmanager.integration.boundedcontext.ai.aiprofile

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileDefaultModelConfigSelectedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class SelectAiProfileDefaultModelConfigCommandTest(
    private val eventRepository: EventRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should select default model config for AI profile`() {
        // Arrange - Create profile and model config
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Config_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )

        // Act - Select as default
        commandInvoker.invoke(
            SelectAiProfileDefaultModelConfigCommand(
                aiProfileId = profile.id!!,
                modelConfigId = modelConfig.id!!
            )
        )

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileDefaultModelConfigSelectedEvent" }
        assertTrue(events.size >= 1, "Should emit AiProfileDefaultModelConfigSelectedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AiProfileDefaultModelConfigSelectedEvent>(events.first().payload)
        assertEquals(profile.id, payload.aiProfileId)
        assertEquals(modelConfig.id, payload.modelConfigId)

        // Assert - Profile updated
        val savedProfile = aiProfileRepository.findById(profile.id!!).orElse(null)
        assertEquals(modelConfig.id, savedProfile.selectedModelConfigId)
    }

    @Test
    fun `should update default model config when selecting different config`() {
        // Arrange - Create profile and two model configs
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val config1 = commandInvoker.invoke(
            CreateModelConfigCommand("Config1_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )
        val config2 = commandInvoker.invoke(
            CreateModelConfigCommand("Config2_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.AZURE_OPENAI, profile.id!!)
        )

        // Act - Select first config
        commandInvoker.invoke(
            SelectAiProfileDefaultModelConfigCommand(profile.id!!, config1.id!!)
        )

        // Act - Select second config
        commandInvoker.invoke(
            SelectAiProfileDefaultModelConfigCommand(profile.id!!, config2.id!!)
        )

        // Assert - Profile has second config selected
        val savedProfile = aiProfileRepository.findById(profile.id!!).orElse(null)
        assertEquals(config2.id, savedProfile.selectedModelConfigId)
    }

    @Test
    fun `should throw error when selecting model config not belonging to profile`() {
        // Arrange - Create two profiles with their own configs
        val profile1 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile1_${System.currentTimeMillis()}", "First")
        )
        val profile2 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile2_${System.currentTimeMillis()}", "Second")
        )
        val config2 = commandInvoker.invoke(
            CreateModelConfigCommand("Config2_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile2.id!!)
        )

        // Act & Assert - Try to assign profile2's config to profile1
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                SelectAiProfileDefaultModelConfigCommand(profile1.id!!, config2.id!!)
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("does not belong to AI Profile"))
    }

    @Test
    fun `should throw error when selecting non-existent model config`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                SelectAiProfileDefaultModelConfigCommand(profile.id!!, 99999)
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("Model Config with id 99999 not found"))
    }
}

