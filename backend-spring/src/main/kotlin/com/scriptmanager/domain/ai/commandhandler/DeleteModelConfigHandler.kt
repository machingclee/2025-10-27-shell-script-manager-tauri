package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.modelconfig.DeleteModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigDeletedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ModelConfigRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class DeleteModelConfigHandler(
    private val modelConfigRepository: ModelConfigRepository,
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<DeleteModelConfigCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: DeleteModelConfigCommand) {
        val modelConfig = modelConfigRepository.findByIdOrNull(command.modelConfigId)
            ?: throw AIException("Model Config with id ${command.modelConfigId} not found")

        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw AIException("AI Profile with id ${command.aiProfileId} not found")

        // Delete the relation only
        aiProfile.modelConfigs.removeIf { it.id == command.modelConfigId }

        aiProfileRepository.save(aiProfile)

        // Delete the model config (cascade will handle OpenAI/Azure configs)
        modelConfigRepository.deleteById(command.modelConfigId)

        eventQueue.add(
            ModelConfigDeletedEvent(
                modelConfigId = command.modelConfigId,
                aiProfileId = command.aiProfileId
            )
        )
    }
}

