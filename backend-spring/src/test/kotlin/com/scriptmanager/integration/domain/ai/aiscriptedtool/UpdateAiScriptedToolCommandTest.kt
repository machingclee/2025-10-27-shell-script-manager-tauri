package com.scriptmanager.integration.domain.ai.aiscriptedtool

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.domain.ai.command.scriptedtool.UpdateAiScriptedToolCommand
import com.scriptmanager.domain.ai.event.AiScriptedToolUpdatedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIScriptedToolRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.repository.findByIdOrNull

@SpringBootTest
class UpdateAiScriptedToolCommandTest(
    private val eventRepository: EventRepository,
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should update AI scripted tool name and description`() {
        // Arrange - Create dependencies and tool
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val original = commandInvoker.invoke(
            CreateAIScriptedToolCommand("Original", "Original description", script.id!!, true, profile.id!!)
        )

        val updatedName = "Updated_${System.currentTimeMillis()}"
        val updatedDescription = "Updated description"

        // Act - Update the tool
        val result = commandInvoker.invoke(
            UpdateAiScriptedToolCommand(
                aiScriptedToolDTO = AiScriptedToolDTO(
                    id = original.id!!,
                    name = updatedName,
                    toolDescription = updatedDescription,
                    isEnabled = true,
                    shellScriptId = script.id!!,
                    createdAt = original.createdAt,
                    createdAtHk = original.createdAtHk
                )
            )
        )

        // Assert - Command result
        assertEquals(original.id, result.id)
        assertEquals(updatedName, result.name)
        assertEquals(updatedDescription, result.toolDescription)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiScriptedToolUpdatedEvent" }
        assertEquals(1, events.size, "Should emit AiScriptedToolUpdatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AiScriptedToolUpdatedEvent>(events.first().payload)
        assertEquals(updatedName, payload.aiScriptedToolDTO.name)

        // Assert - Persistence
        val saved = aiScriptedToolRepository.findByIdOrNull(original.id!!) ?: throw AIException("Updated tool not found")
        assertNotNull(saved)
        assertEquals(updatedName, saved.name)
        assertEquals(updatedDescription, saved.toolDescription)
    }

    @Test
    fun `should toggle AI scripted tool enabled status`() {
        // Arrange
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val tool = commandInvoker.invoke(
            CreateAIScriptedToolCommand("Tool", "Description", script.id!!, true, profile.id!!)
        )

        // Act - Disable the tool
        val result = commandInvoker.invoke(
            UpdateAiScriptedToolCommand(
                aiScriptedToolDTO = AiScriptedToolDTO(
                    id = tool.id!!,
                    name = tool.name,
                    toolDescription = tool.toolDescription,
                    isEnabled = false,
                    shellScriptId = script.id!!,
                    createdAt = tool.createdAt,
                    createdAtHk = tool.createdAtHk
                )
            )
        )

        // Assert
        assertFalse(result.isEnabled)

        val saved = aiScriptedToolRepository.findByIdOrNull(tool.id!!) ?: throw AIException("Updated tool not found")
        assertFalse(saved.isEnabled)
    }

    @Test
    fun `should throw error when updating non-existent tool`() {
        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                UpdateAiScriptedToolCommand(
                    aiScriptedToolDTO = AiScriptedToolDTO(
                        id = 99999,
                        name = "NonExistent",
                        toolDescription = "Test",
                        isEnabled = true,
                        shellScriptId = 1,
                        createdAt = null,
                        createdAtHk = null
                    )
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Scripted Tool with id 99999 not found"))
    }
}

