package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.dto.ShellScriptResponse

data class CreateScriptCommand(
    val folderId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptResponse>

