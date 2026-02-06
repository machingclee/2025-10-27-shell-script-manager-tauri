package com.scriptmanager.boundedcontext.scriptmanager.policy

import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.Policy
import com.scriptmanager.common.domainutils.PolicyFlow
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

    override fun declareflows(): List<PolicyFlow> = listOf(
        PolicyFlow(
            fromEvent = ScriptExecutedEvent::class.java,
            toCommand = CreateScriptHistoryCommand::class.java
        )
    )

    @EventListener
    fun onScriptExecuted(event: ScriptExecutedEvent) {
        val command = CreateScriptHistoryCommand(
            scriptId = event.scriptId,
            time = System.currentTimeMillis()
        )
        commandInvoker.invoke(command)
    }
}