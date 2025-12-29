package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.ai.command.CreateAiProfileCommand
import com.scriptmanager.domain.ai.event.AiProfileCreatedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component


@Component
class CreateAiProfileHandler(
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<CreateAiProfileCommand, AiProfile> {
    override fun handle(eventQueue: EventQueue, command: CreateAiProfileCommand): AiProfile {
        val (name, description) = command
        val aiProfile = AiProfile(
            name = name,
            description = description
        )
        aiProfileRepository.save(aiProfile)
        eventQueue.add(AiProfileCreatedEvent(aiProfile.toDTO()))
        return aiProfile
    }
}