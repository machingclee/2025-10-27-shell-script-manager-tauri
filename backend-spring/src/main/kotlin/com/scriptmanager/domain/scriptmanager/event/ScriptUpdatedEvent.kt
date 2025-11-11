package com.scriptmanager.domain.scriptmanager.event


import com.scriptmanager.common.entity.ShellScriptDTO

data class ScriptUpdatedEvent(
    val script: ShellScriptDTO
)

