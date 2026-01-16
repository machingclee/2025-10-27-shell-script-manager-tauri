package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.SelectDefaultAiProfileCommand
import com.scriptmanager.domain.ai.event.DefaultAiProfileSelectedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class SelectDefaultAiProfileHandler(
    private val applicationStateRepository: ApplicationStateRepository,
    private val aiProfileRepository: AIProfileRepository
) : CommandHandler<SelectDefaultAiProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: SelectDefaultAiProfileCommand) {
        val aiProfile = aiProfileRepository.findByIdOrNull(command.aiProfileId)
            ?: throw Exception("AI Profile with id ${command.aiProfileId} not found")

        val applicationState = applicationStateRepository.findAll().firstOrNull()
            ?: throw Exception("Application state not found")

        applicationState.selectedAiProfileId = command.aiProfileId
        applicationStateRepository.save(applicationState)

        eventQueue.add(DefaultAiProfileSelectedEvent(aiProfileId = command.aiProfileId))
    }
}

