package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.domain.infrastructure.Command

data class DeleteScriptCommand(
    val id: Int,
    val folderId: Int
) : Command<Unit>

