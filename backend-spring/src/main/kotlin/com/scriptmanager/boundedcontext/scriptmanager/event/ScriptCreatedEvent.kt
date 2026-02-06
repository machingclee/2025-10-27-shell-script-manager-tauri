package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.dto.ShellScriptResponse

data class ScriptCreatedEvent(
    val script: ShellScriptResponse
)

