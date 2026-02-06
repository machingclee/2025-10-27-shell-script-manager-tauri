package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.event.AIScriptedToolCreatedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.AIScriptedToolRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateAIScriptedToolHandler(
    private val shellScriptRepository: ShellScriptRepository,
    private val aiScriptedToolRepository: AIScriptedToolRepository,
    private val aiProfileRepository: AIProfileRepository,
    private val entityManager: EntityManager
) : CommandHandler<CreateAIScriptedToolCommand, AiScriptedTool> {

    override fun handle(eventQueue: EventQueue, command: CreateAIScriptedToolCommand): AiScriptedTool {
        val (name, toolDescription, scriptId, isEnabled, aiProfileId) = command
        shellScriptRepository.findByIdOrNull(scriptId)
            ?: throw ScriptManagerException("Shell Script with id ${command.scriptId} not found")
        val airProifle = aiProfileRepository.findByIdOrNull(aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        val aiScriptedTool = AiScriptedTool(
            name = name,
            toolDescription = toolDescription,
            shellScriptId = scriptId,
            isEnabled = isEnabled
        )

        airProifle.addTool(aiScriptedTool)
        aiScriptedToolRepository.save(aiScriptedTool)
        entityManager.flush()
        entityManager.refresh(aiScriptedTool)
        eventQueue.add(
            AIScriptedToolCreatedEvent(
                aiprofileId = aiProfileId,
                aiScriptedTool = aiScriptedTool.toDTO()
            )
        )
        return aiScriptedTool
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        AIScriptedToolCreatedEvent::class.java
    )
}