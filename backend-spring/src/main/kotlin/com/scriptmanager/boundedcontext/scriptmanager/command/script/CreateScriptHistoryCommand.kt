package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.domainutils.Command

data class CreateScriptHistoryCommand(
    val scriptId: Int,
    val time: Long
) : Command<Unit>
