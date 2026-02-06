package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.domainutils.Command

data class CreateScriptCommand(
    val folderId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptResponse>

