package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class DeleteScriptCommand(
    val id: Int,
    val folderId: Int
) : Command<Unit>

