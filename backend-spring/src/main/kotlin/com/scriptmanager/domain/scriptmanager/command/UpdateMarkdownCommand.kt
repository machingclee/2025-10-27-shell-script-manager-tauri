package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateMarkdownCommand(
    val scriptId: Int,
    val content: String
) : Command<ShellScriptDTO>
