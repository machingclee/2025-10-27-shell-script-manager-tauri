package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.dto.ShellScriptResponse

data class ScriptDuplicatedEvent(
    val sourceScriptId: Int,
    val script: ShellScriptResponse
)
