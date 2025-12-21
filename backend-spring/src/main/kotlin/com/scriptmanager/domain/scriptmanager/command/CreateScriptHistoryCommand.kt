package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class CreateScriptHistoryCommand(
    val scriptId: Int,
    val time: Long
) : Command<Unit>
