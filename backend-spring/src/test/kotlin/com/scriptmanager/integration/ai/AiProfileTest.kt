package com.scriptmanager.integration.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.ai.command.CreateAiProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileCreatedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.AIProfileRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


/**
 * Tests for AI Profile API endpoints
 * Maps to: POST /ai/ai-profile
 * Domain: com.scriptmanager.domain.ai
 */
@SpringBootTest
class AiProfileTest(
    private val eventRepository: EventRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create AI profile via POST ai-profile`() {
        // Arrange
        val profileName = "TestProfile_${System.currentTimeMillis()}"
        val description = "AI profile for testing"

        // Act - Simulates POST /ai/ai-profile
        val result = commandInvoker.invoke(
            CreateAiProfileCommand(
                name = profileName,
                description = description
            )
        )

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(profileName, result.name)
        assertEquals(description, result.description)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileCreatedEvent" }
        assertEquals(1, events.size, "Should emit AiProfileCreatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload (note: field is lowercase 'aiprofile')
        val payload = objectMapper.readValue<AiProfileCreatedEvent>(events.first().payload)
        assertEquals(profileName, payload.aiprofile.name)

        // Assert - Persistence
        val saved = aiProfileRepository.findById(result.id!!).orElse(null)
        assertNotNull(saved)
        assertEquals(profileName, saved.name)
        assertEquals(description, saved.description)
    }

    @Test
    fun `should create multiple AI profiles independently`() {
        // Arrange & Act
        val profile1 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile1_${System.currentTimeMillis()}", "Description 1")
        )
        val profile2 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile2_${System.currentTimeMillis()}", "Description 2")
        )

        // Assert
        assertNotEquals(profile1.id, profile2.id)

        // Assert - Both events exist
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileCreatedEvent" }
        assertEquals(2, events.size)
    }

    @Test
    fun `should handle AI profile with empty description`() {
        // Arrange
        val profileName = "EmptyDescProfile_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(
            CreateAiProfileCommand(profileName, "")
        )

        // Assert
        assertEquals("", result.description)
        val saved = aiProfileRepository.findById(result.id!!).orElse(null)
        assertEquals("", saved.description)
    }
}

