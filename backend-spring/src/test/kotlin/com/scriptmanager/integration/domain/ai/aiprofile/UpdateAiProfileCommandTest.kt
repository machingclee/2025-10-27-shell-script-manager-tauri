package com.scriptmanager.integration.boundedcontext.ai.aiprofile

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.UpdateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileUpdatedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class UpdateAiProfileCommandTest(
    private val eventRepository: EventRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should update AI profile name and description`() {
        // Arrange - Create AI profile first
        val original = commandInvoker.invoke(
            CreateAiProfileCommand("Original_${System.currentTimeMillis()}", "Original description")
        )

        val updatedName = "Updated_${System.currentTimeMillis()}"
        val updatedDescription = "Updated description"

        // Act - Update the profile
        val result = commandInvoker.invoke(
            UpdateAiProfileCommand(
                aiProfileDTO = AiProfileDTO(
                    id = original.id!!,
                    name = updatedName,
                    description = updatedDescription,
                    selectedModelConfigId = null,
                    createdAt = original.createdAt,
                    createdAtHk = original.createdAtHk
                )
            )
        )

        // Assert - Command result
        assertEquals(original.id, result.id)
        assertEquals(updatedName, result.name)
        assertEquals(updatedDescription, result.description)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileUpdatedEvent" }
        assertEquals(1, events.size, "Should emit AiProfileUpdatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AiProfileUpdatedEvent>(events.first().payload)
        assertEquals(updatedName, payload.aiProfile.name)

        // Assert - Persistence
        val saved = aiProfileRepository.findById(original.id!!).orElse(null)
        assertNotNull(saved)
        assertEquals(updatedName, saved.name)
        assertEquals(updatedDescription, saved.description)
    }

    @Test
    fun `should update AI profile with selected model config`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act - Update with selected model config
        val result = commandInvoker.invoke(
            UpdateAiProfileCommand(
                aiProfileDTO = AiProfileDTO(
                    id = profile.id!!,
                    name = profile.name,
                    description = profile.description,
                    selectedModelConfigId = 123,
                    createdAt = profile.createdAt,
                    createdAtHk = profile.createdAtHk
                )
            )
        )

        // Assert
        assertEquals(123, result.selectedModelConfigId)

        val saved = aiProfileRepository.findById(profile.id!!).orElse(null)
        assertEquals(123, saved.selectedModelConfigId)
    }

    @Test
    fun `should throw error when updating non-existent profile`() {
        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                UpdateAiProfileCommand(
                    aiProfileDTO = AiProfileDTO(
                        id = 99999,
                        name = "NonExistent",
                        description = "Test",
                        selectedModelConfigId = null,
                        createdAt = null,
                        createdAtHk = null
                    )
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Profile with id 99999 not found"))
    }
}

