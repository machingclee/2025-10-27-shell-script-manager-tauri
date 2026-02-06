package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.entity.ShellScriptDTO

data class ScriptUpdatedEvent(
    val script: ShellScriptDTO
)

