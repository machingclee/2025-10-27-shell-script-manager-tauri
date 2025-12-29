package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.ai.command.CreateModelConfigCommand
import com.scriptmanager.domain.ai.event.ModelConfigCreatedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ModelConfigRepository
import jakarta.persistence.EntityManager
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class CreateModelConfigHandler(
    private val aiProfileRepository: AIProfileRepository,
    private val modelConfigRepository: ModelConfigRepository,
    private val entityManager: EntityManager
) : CommandHandler<CreateModelConfigCommand, ModelConfigDTO> {
    override fun handle(eventQueue: EventQueue, command: CreateModelConfigCommand): ModelConfigDTO {
        val (name, modelSource, aiprofileId) = command
        val aiProfile = aiProfileRepository.findByIdOrNull(aiprofileId)
            ?: throw Exception("AI Profile with id $aiprofileId not found")
        val modelConfig = ModelConfig(
            name = name,
            modelSource = ModelConfig.ModelSource(modelSource)
        )
        modelConfigRepository.save(modelConfig)

        aiProfile.modelConfigs.add(modelConfig)
        aiProfileRepository.save(aiProfile)
        entityManager.flush()

        eventQueue.add(ModelConfigCreatedEvent(modelConfig.toDTO()))
        return modelConfig.toDTO()
    }
}