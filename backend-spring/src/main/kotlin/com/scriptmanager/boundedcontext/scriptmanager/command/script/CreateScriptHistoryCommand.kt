package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command

data class CreateScriptHistoryCommand(
    val scriptId: Int,
    val time: Long
) : Command<Unit>
