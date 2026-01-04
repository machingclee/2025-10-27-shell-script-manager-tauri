package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateMarkdownCommand(
    val scriptId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptDTO>
