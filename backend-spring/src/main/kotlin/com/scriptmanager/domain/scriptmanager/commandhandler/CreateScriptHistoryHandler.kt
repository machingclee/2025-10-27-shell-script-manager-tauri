package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.HistoricalShellScript
import com.scriptmanager.common.entity.HistoricalShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateScriptHistoryCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptHistoryCreatedEvent
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
}
