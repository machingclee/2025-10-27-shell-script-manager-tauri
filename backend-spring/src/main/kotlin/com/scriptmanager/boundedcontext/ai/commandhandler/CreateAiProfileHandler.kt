package com.scriptmanager.boundedcontext.ai.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.AiProfileCreatedEvent
import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.toDTO
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