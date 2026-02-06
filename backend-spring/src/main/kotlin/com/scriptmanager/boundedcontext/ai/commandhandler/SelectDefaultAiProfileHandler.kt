package com.scriptmanager.boundedcontext.ai.commandhandler

import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.boundedcontext.ai.event.DefaultAiProfileSelectedEvent
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.service.ApplicationStateAIService
import org.springframework.stereotype.Component

@Component
class SelectDefaultAiProfileHandler(
    private val applicationStateAIService: ApplicationStateAIService
) : CommandHandler<SelectDefaultAiProfileCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: SelectDefaultAiProfileCommand) {
        applicationStateAIService.updateSelectedAiProfile(command.aiProfileId)
        eventQueue.add(DefaultAiProfileSelectedEvent(aiProfileId = command.aiProfileId))
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        DefaultAiProfileSelectedEvent::class.java
    )
}
