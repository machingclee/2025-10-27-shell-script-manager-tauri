package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteScriptCommand(
    val scriptId: Int,
    val folderId: Int
) : Command<Unit>

