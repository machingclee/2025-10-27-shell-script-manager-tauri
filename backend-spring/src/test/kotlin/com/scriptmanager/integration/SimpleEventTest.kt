package com.scriptmanager.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.annotation.DirtiesContext.ClassMode
import org.springframework.test.context.ActiveProfiles

/**
 * Simplified event testing using @DirtiesContext for test isolation.
 *
 * This approach rebuilds the Spring context after each test, ensuring complete isolation
 * but at the cost of slower test execution. Use this if you're having transaction issues.
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
@DirtiesContext(classMode = ClassMode.AFTER_EACH_TEST_METHOD)
class SimpleEventTest(
    private val commandInvoker: CommandInvoker,
    private val eventRepository: EventRepository,
    private val objectMapper: ObjectMapper
) {

    @Test
    fun `should emit WorkspaceCreatedEvent when creating workspace`() {
        // Arrange
        val workspaceName = "TestWorkspace_${System.currentTimeMillis()}"

        // Act
        val result = commandInvoker.invoke(CreateWorkspaceCommand(workspaceName))

        // Assert - Find the event
        val events = eventRepository.findAll()
            .filter { it.eventType == "WorkspaceCreatedEvent" }
            .filter { event ->
                val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(event.event)
                eventData.workspace.name == workspaceName
            }

        assertEquals(1, events.size, "Should have exactly 1 WorkspaceCreatedEvent")

        val event = events.first()
        assertEquals("WorkspaceCreatedEvent", event.eventType)
        assertTrue(event.success)

        val eventData = objectMapper.readValue<WorkspaceCreatedEvent>(event.event)
        assertEquals(workspaceName, eventData.workspace.name)
        assertEquals(result.id, eventData.workspace.id)
    }
}

