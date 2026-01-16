package com.scriptmanager.integration.domain.ai.aiprofile

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.domain.ai.event.DefaultAiProfileSelectedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.ApplicationStateRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class SelectDefaultAiProfileCommandTest(
    private val eventRepository: EventRepository,
    private val applicationStateRepository: ApplicationStateRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should select default AI profile in application state`() {
        // Arrange - Create AI profile
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("DefaultProfile_${System.currentTimeMillis()}", "Description")
        )

        // Act - Select as default
        commandInvoker.invoke(SelectDefaultAiProfileCommand(aiProfileId = profile.id!!))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "DefaultAiProfileSelectedEvent" }
        assertTrue(events.size >= 1, "Should emit DefaultAiProfileSelectedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<DefaultAiProfileSelectedEvent>(events.first().payload)
        assertEquals(profile.id, payload.aiProfileId)

        // Assert - Application state updated
        val appState = applicationStateRepository.findAll().firstOrNull()
        assertNotNull(appState)
        assertEquals(profile.id, appState?.selectedAiProfileId)
    }

    @Test
    fun `should update default AI profile when selecting different profile`() {
        // Arrange - Create two profiles
        val profile1 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile1_${System.currentTimeMillis()}", "First")
        )
        val profile2 = commandInvoker.invoke(
            CreateAiProfileCommand("Profile2_${System.currentTimeMillis()}", "Second")
        )

        // Act - Select first profile
        commandInvoker.invoke(SelectDefaultAiProfileCommand(aiProfileId = profile1.id!!))

        // Act - Select second profile
        commandInvoker.invoke(SelectDefaultAiProfileCommand(aiProfileId = profile2.id!!))

        // Assert - Application state has second profile
        val appState = applicationStateRepository.findAll().firstOrNull()
        assertEquals(profile2.id, appState?.selectedAiProfileId)

        // Assert - Two events emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "DefaultAiProfileSelectedEvent" }
        assertTrue(events.size >= 2)
    }

    @Test
    fun `should throw error when selecting non-existent profile`() {
        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(SelectDefaultAiProfileCommand(aiProfileId = 99999))
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Profile with id 99999 not found"))
    }
}

