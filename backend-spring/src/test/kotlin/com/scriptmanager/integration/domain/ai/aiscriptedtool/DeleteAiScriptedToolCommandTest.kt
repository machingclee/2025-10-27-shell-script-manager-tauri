package com.scriptmanager.integration.boundedcontext.ai.aiscriptedtool

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.DeleteAiScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.event.AiScriptedToolDeletedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIScriptedToolRepository
import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class DeleteAiScriptedToolCommandTest(
    private val eventRepository: EventRepository,
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should delete AI scripted tool`() {
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
        val tool = commandInvoker.invoke(
            CreateAIScriptedToolCommand("ToDelete", "Will be deleted", script.id!!, true, profile.id!!)
        )

        // Act - Delete the tool
        commandInvoker.invoke(
            DeleteAiScriptedToolCommand(
                aiScriptedToolId = tool.id!!,
                aiProfileId = profile.id!!
            )
        )

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiScriptedToolDeletedEvent" }
        assertEquals(1, events.size, "Should emit AiScriptedToolDeletedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AiScriptedToolDeletedEvent>(events.first().payload)
        assertEquals(tool.id, payload.aiScriptedToolId)
        assertEquals(profile.id, payload.aiProfileId)

        // Assert - Tool is deleted
        assertFalse(aiScriptedToolRepository.existsById(tool.id!!))
    }

    @Test
    fun `should delete multiple tools independently`() {
        // Arrange - Create multiple tools
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script1 = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script1_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val script2 = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script2_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )
        val tool1 = commandInvoker.invoke(
            CreateAIScriptedToolCommand("Tool1", "First tool", script1.id!!, true, profile.id!!)
        )
        val tool2 = commandInvoker.invoke(
            CreateAIScriptedToolCommand("Tool2", "Second tool", script2.id!!, true, profile.id!!)
        )

        // Act - Delete first tool
        commandInvoker.invoke(DeleteAiScriptedToolCommand(tool1.id!!, profile.id!!))

        // Assert - First tool deleted, second still exists
        assertFalse(aiScriptedToolRepository.existsById(tool1.id!!))
        assertTrue(aiScriptedToolRepository.existsById(tool2.id!!))

        // Assert - One delete event
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiScriptedToolDeletedEvent" }
        assertEquals(1, events.size)
    }

    @Test
    fun `should throw error when deleting non-existent tool`() {
        // Arrange
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("Profile_${System.currentTimeMillis()}", "Description")
        )

        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(
                DeleteAiScriptedToolCommand(99999, profile.id!!)
            )
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Scripted Tool with id 99999 not found"))
    }
}

