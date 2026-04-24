package com.scriptmanager.boundedcontext.scriptmanager.policy

import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.Invariant
import com.scriptmanager.common.domainutils.NextCommand
import com.scriptmanager.common.domainutils.Policy
import com.scriptmanager.boundedcontext.scriptmanager.command.script.CreateScriptHistoryCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptExecutedEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

/**
 * Policy that automatically records script execution history when a script is executed.
 * This is a side effect triggered by the ScriptExecutedEvent domain event.
 */
@Component
class RecordExecutedCommandIntoHistoryPolicy(
    private val commandInvoker: CommandInvoker
) : Policy {

    @EventListener
    @Invariant("Whenever a script is executed, create a history record to capture the event")
    @NextCommand(CreateScriptHistoryCommand::class)
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        val command = CreateScriptHistoryCommand(
            scriptId = event.scriptId,
            time = System.currentTimeMillis()
        )
        commandInvoker.invoke(command)
    }
}

