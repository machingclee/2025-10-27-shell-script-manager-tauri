package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.ShellScriptDTO


data class ScriptDeletedEvent(
    val folderId: Int,
    val script: ShellScriptDTO
)

