package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.domain.ai.command.UpdateAiProfileCommand
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
        val dto = command.aiProfileDTO
        val aiProfile = aiProfileRepository.findByIdOrNull(dto.id)
            ?: throw Exception("AI Profile with id ${dto.id} not found")

        aiProfile.name = dto.name
        aiProfile.description = dto.description
        aiProfile.selectedModelConfigId = dto.selectedModelConfigId

        aiProfileRepository.save(aiProfile)
        return aiProfile
    }
}

