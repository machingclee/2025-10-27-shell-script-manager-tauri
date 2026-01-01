package com.scriptmanager.integration.shellscriptmanager

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import com.scriptmanager.domain.scriptmanager.event.WorkspaceCreatedEvent
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest


@SpringBootTest
class SimpleEventTest(
    private val eventRepository: EventRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

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
                val payload = objectMapper.readValue<WorkspaceCreatedEvent>(event.payload)
                payload.workspace.name == workspaceName
            }

        assertEquals(1, events.size, "Should have exactly 1 WorkspaceCreatedEvent")
        val event = events.first()
        assertTrue(event.success)

        val payload = objectMapper.readValue<WorkspaceCreatedEvent>(event.payload)
        assertEquals(workspaceName, payload.workspace.name)
        assertEquals(result.id, payload.workspace.id)
    }
}

