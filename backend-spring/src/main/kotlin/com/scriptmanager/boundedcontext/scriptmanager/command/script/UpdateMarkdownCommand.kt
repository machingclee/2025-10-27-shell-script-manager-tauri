package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ShellScriptDTO

data class UpdateMarkdownCommand(
    val scriptId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptDTO>
