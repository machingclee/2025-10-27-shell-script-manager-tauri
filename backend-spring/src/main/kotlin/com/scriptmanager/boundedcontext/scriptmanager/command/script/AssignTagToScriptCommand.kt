package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command

data class AssignTagToScriptCommand(
    val scriptId: Int,
    val tagId: Int
) : Command<Unit>
