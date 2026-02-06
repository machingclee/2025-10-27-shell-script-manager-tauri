package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateMarkdownCommand(
    val scriptId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptDTO>
