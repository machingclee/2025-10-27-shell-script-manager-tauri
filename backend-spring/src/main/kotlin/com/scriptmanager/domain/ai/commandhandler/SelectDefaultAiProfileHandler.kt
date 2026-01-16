package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.domain.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.domain.ai.event.DefaultAiProfileSelectedEvent
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.service.ApplicationStateAIService
import org.springframework.stereotype.Component

@Component
class SelectDefaultAiProfileHandler(
    private val applicationStateAIService: ApplicationStateAIService
) : CommandHandler<SelectDefaultAiProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: SelectDefaultAiProfileCommand) {
        applicationStateAIService.updateSelectedAiProfile(command.aiProfileId)
        eventQueue.add(DefaultAiProfileSelectedEvent(aiProfileId = command.aiProfileId))
    }
}

