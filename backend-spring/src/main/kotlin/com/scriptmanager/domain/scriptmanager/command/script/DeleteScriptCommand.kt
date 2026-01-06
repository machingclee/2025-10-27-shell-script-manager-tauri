package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.domain.infrastructure.Command

data class DeleteScriptCommand(
    val scriptId: Int,
    val folderId: Int
) : Command<Unit>

