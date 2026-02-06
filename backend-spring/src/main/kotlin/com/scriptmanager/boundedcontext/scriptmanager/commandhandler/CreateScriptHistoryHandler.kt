package com.scriptmanager.boundedcontext.scriptmanager.commandhandler

import com.scriptmanager.common.entity.HistoricalShellScript
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.script.CreateScriptHistoryCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptHistoryCreatedEvent
import com.scriptmanager.repository.HistoricalShellScriptRepository
import org.springframework.stereotype.Component

@Component
class CreateScriptHistoryHandler(
    private val scriptHistoryRepository: HistoricalShellScriptRepository
) : CommandHandler<CreateScriptHistoryCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: CreateScriptHistoryCommand) {
        val scriptId = command.scriptId
        val pastHistory = scriptHistoryRepository.findFirstByShellScriptId(scriptId)
        var event: ScriptHistoryCreatedEvent

        if (pastHistory != null) {
            pastHistory.executedAt = command.time.toDouble()

            event = ScriptHistoryCreatedEvent(
                history = pastHistory.toDTO()
            )

        } else {
            val history = HistoricalShellScript(
                shellScriptId = scriptId,
                executedAt = command.time.toDouble()
            )
            scriptHistoryRepository.save(history)
            event = ScriptHistoryCreatedEvent(
                history = history.toDTO()
            )
        }

        eventQueue.add(event)
    }

    override fun declareEvents(): List<Class<*>> = listOf(
        ScriptHistoryCreatedEvent::class.java
    )
}
