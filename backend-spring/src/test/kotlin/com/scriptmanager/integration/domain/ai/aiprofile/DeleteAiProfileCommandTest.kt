package com.scriptmanager.integration.boundedcontext.ai.aiprofile

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.DeleteAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileDeletedEvent
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.CreateFolderCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.script.CreateScriptCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.CreateWorkspaceCommand
import com.scriptmanager.integration.BaseTest
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.AIScriptedToolRepository
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class DeleteAiProfileCommandTest(
    private val eventRepository: EventRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val commandInvoker: CommandInvoker,
    private val objectMapper: ObjectMapper
) : BaseTest(eventRepository) {

    @Test
    fun `should delete AI profile`() {
        // Arrange - Create AI profile
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("ToDelete_${System.currentTimeMillis()}", "Will be deleted")
        )

        // Act - Delete the profile
        commandInvoker.invoke(DeleteAiProfileCommand(aiProfileId = profile.id!!))

        // Assert - Event emitted
        val events = eventRepository.findAll()
            .filter { it.eventType == "AiProfileDeletedEvent" }
        assertEquals(1, events.size, "Should emit AiProfileDeletedEvent")
        assertTrue(events.first().success)

        // Assert - Event payload
        val payload = objectMapper.readValue<AiProfileDeletedEvent>(events.first().payload)
        assertEquals(profile.id, payload.aiProfileId)

        // Assert - Profile is deleted
        assertFalse(aiProfileRepository.existsById(profile.id!!))
    }

    @Test
    fun `should delete AI profile and cascade delete model configs`() {
        // Arrange - Create profile with model configs
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("ProfileWithConfigs_${System.currentTimeMillis()}", "Description")
        )

        val modelConfig = commandInvoker.invoke(
            CreateModelConfigCommand("Config_${System.currentTimeMillis()}", ModelConfig.ModelSourceType.OPENAI, profile.id!!)
        )

        // Act - Delete profile
        commandInvoker.invoke(DeleteAiProfileCommand(aiProfileId = profile.id!!))

        // Assert - Profile and model config are deleted
        assertFalse(aiProfileRepository.existsById(profile.id!!))
        assertFalse(modelConfigRepository.existsById(modelConfig.id!!))

        // Assert - Events for both deletions
        val profileDeleteEvents = eventRepository.findAll()
            .filter { it.eventType == "AiProfileDeletedEvent" }
        val modelConfigDeleteEvents = eventRepository.findAll()
            .filter { it.eventType == "ModelConfigDeletedEvent" }

        assertEquals(1, profileDeleteEvents.size)
        assertEquals(1, modelConfigDeleteEvents.size)
    }

    @Test
    fun `should delete AI profile and cascade delete scripted tools`() {
        // Arrange - Create workspace, folder, script, profile, and scripted tool
        val workspace = commandInvoker.invoke(CreateWorkspaceCommand("Workspace_${System.currentTimeMillis()}"))
        val folder = commandInvoker.invoke(
            CreateFolderCommand("Folder_${System.currentTimeMillis()}")
        )
        val script = commandInvoker.invoke(
            CreateScriptCommand(folder.id!!, "Script_${System.currentTimeMillis()}", "#!/bin/bash")
        )
        val profile = commandInvoker.invoke(
            CreateAiProfileCommand("ProfileWithTool_${System.currentTimeMillis()}", "Description")
        )
        val tool = commandInvoker.invoke(
            CreateAIScriptedToolCommand("Tool", "Description", script.id!!, true, profile.id!!)
        )

        // Act - Delete profile
        commandInvoker.invoke(DeleteAiProfileCommand(aiProfileId = profile.id!!))

        // Assert - Profile and tool are deleted
        assertFalse(aiProfileRepository.existsById(profile.id!!))
        assertFalse(aiScriptedToolRepository.existsById(tool.id!!))
    }

    @Test
    fun `should throw error when deleting non-existent profile`() {
        // Act & Assert
        val exception = assertThrows(Exception::class.java) {
            commandInvoker.invoke(DeleteAiProfileCommand(aiProfileId = 99999))
        }

        // Assert
        assertTrue(exception.message!!.contains("AI Profile with id 99999 not found"))
    }
}

