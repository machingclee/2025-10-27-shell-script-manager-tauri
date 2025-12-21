package com.scriptmanager.domain.scriptmanager.policy

import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateScriptHistoryCommand
import com.scriptmanager.domain.scriptmanager.event.ScriptExecutedEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

/**
 * Policy that automatically records script execution history when a script is executed.
 * This is a side effect triggered by the ScriptExecutedEvent domain event.
 */
@Component
class RecordExecutedCommandIntoHistoryPolicy(
    private val commandInvoker: CommandInvoker
) {

    @EventListener
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        val command = CreateScriptHistoryCommand(
            scriptId = event.scriptId,
            time = System.currentTimeMillis()
        )
        commandInvoker.invoke(command)
    }
}