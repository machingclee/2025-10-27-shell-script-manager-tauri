package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.HistoricalShellScript
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.CreateScriptHistoryCommand
import com.scriptmanager.repository.HistoricalShellScriptRepository
import org.springframework.stereotype.Component

@Component
class CreateScriptHistoryHandler(
    private val scriptHistoryRepository: HistoricalShellScriptRepository
) : CommandHandler<CreateScriptHistoryCommand, Unit> {

    override fun handle(eventQueue: EventQueue, command: CreateScriptHistoryCommand) {
        val scriptId = command.scriptId
        val pastHistory = scriptHistoryRepository.findFirstByShellScriptId(scriptId)

        if (pastHistory != null) {
            pastHistory.executedAt = command.time.toDouble()
        } else {
            val history = HistoricalShellScript(
                shellScriptId = scriptId,
                executedAt = command.time.toDouble()
            )
            scriptHistoryRepository.save(history)
        }
    }
}
