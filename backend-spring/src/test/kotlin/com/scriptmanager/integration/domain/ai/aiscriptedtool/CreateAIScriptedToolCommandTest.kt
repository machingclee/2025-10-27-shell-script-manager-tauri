package com.scriptmanager.integration.domain.ai.aiscriptedtool

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.domain.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.domain.ai.event.AIScriptedToolCreatedEvent
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIScriptedToolRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class CreateAIScriptedToolCommandTest(
    private val eventRepository: EventRepository,
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should create AI scripted tool`() {
        // Arrange - Create folder, script, and profile
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash\necho 'test'")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        val toolName = "Tool_${System.currentTimeMillis()}"
        val toolDescription = "Test tool description"

        // Act - Create AI scripted tool
        val result = commandInvoker.invoke(
            CreateAIScriptedToolCommand(
                name = toolName,
                toolDescription = toolDescription,
                scriptId = script.id!!,
                isEnabled = true,
                aiProfileId = profile.id!!
            )
        )

        // Assert - Command result
        assertNotNull(result.id)
        assertEquals(toolName, result.name)
        assertEquals(toolDescription, result.toolDescription)
        assertEquals(script.id, result.shellScriptId)
        assertTrue(result.isEnabled)

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AIScriptedToolCreatedEvent" }
        assertEquals(1, events.size, "Should emit AIScriptedToolCreatedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AIScriptedToolCreatedEvent>(events.first().payload)
        assertEquals(toolName, payload.aiScriptedTool.name)
        assertEquals(profile.id, payload.aiprofileId)

        // Assert - Persistence
        val saved = aiScriptedToolRepository.findById(result.id!!).orElse(null)
        assertNotNull(saved)
        assertEquals(toolName, saved.name)
    }

    @Test
    fun `should create disabled AI scripted tool`() {
        // Arrange
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act - Create disabled tool
        val result = commandInvoker.invoke(
            CreateAIScriptedToolCommand(
                name = "DisabledTool_${System.currentTimeMillis()}",
                toolDescription = "Disabled tool",
                scriptId = script.id!!,
                isEnabled = false,
                aiProfileId = profile.id!!
            )
        )

        // Assert
        assertFalse(result.isEnabled)

        val saved = aiScriptedToolRepository.findById(result.id!!).orElse(null)
        assertFalse(saved.isEnabled)
    }

    @Test
    fun `should throw error when creating tool with non-existent script`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                CreateAIScriptedToolCommand(
                    name = "Tool",
                    toolDescription = "Description",
                    scriptId = 99999,
                    isEnabled = true,
                    aiProfileId = profile.id!!
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("Shell Script with id 99999 not found"))
    }

    @Test
    fun `should throw error when creating tool with non-existent profile`() {
        // Arrange
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash")
        )

        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                CreateAIScriptedToolCommand(
                    name = "Tool",
                    toolDescription = "Description",
                    scriptId = script.id!!,
                    isEnabled = true,
                    aiProfileId = 99999
                )
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Profile with id 99999 not found"))
    }
}
