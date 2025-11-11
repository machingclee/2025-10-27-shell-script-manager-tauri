package com.scriptmanager.domain.scriptmanager.event


import com.scriptmanager.common.dto.ShellScriptResponse

data class ScriptCreatedEvent(
    val script: ShellScriptResponse
)

