package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.domain.ai.command.aiprofile.UpdateAiProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileUpdatedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateAiProfileHandler(
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<UpdateAiProfileCommand, AiProfile> {
    override fun handle(eventQueue: EventQueue, command: UpdateAiProfileCommand): AiProfile {
        val aiprofileDTO = command.aiProfileDTO
        val aiProfile = aiProfileRepository.findByIdOrNull(aiprofileDTO.id)
            ?: throw AIException("AI Profile with id ${aiprofileDTO.id} not found")

        aiProfile.name = aiprofileDTO.name
        aiProfile.description = aiprofileDTO.description
        aiProfile.selectedModelConfigId = aiprofileDTO.selectedModelConfigId

        aiProfileRepository.save(aiProfile)

        eventQueue.add(AiProfileUpdatedEvent(aiProfile = aiProfile.toDTO()))

        return aiProfile
    }
}

