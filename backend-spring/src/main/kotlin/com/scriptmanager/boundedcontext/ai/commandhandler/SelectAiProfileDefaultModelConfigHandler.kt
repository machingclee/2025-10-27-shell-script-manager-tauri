package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileDefaultModelConfigSelectedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class SelectAiProfileDefaultModelConfigHandler(
    private val aiProfileRepository: AIProfileRepository,
    private val modelConfigRepository: ModelConfigRepository
) : CommandHandler<SelectAiProfileDefaultModelConfigCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: SelectAiProfileDefaultModelConfigCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        val modelConfig = modelConfigRepository.findByIdOrNull(command.modelConfigId)
            ?: throw AIException("Model Config with id ${command.modelConfigId} not found")

        // Use domain behavior to select the model config (it will validate ownership)
        aiProfile.selectDefaultModelConfig(modelConfig)
        aiProfileRepository.save(aiProfile)

        eventQueue.add(
            AiProfileDefaultModelConfigSelectedEvent(
                aiProfileId = command.aiProfileId,
                modelConfigId = command.modelConfigId
            )
        )
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        AiProfileDefaultModelConfigSelectedEvent::class.java
    )
}
