package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.dto.ShellScriptResponse

data class DuplicateScriptCommand(
    val scriptId: Int
) : Command<ShellScriptResponse>
