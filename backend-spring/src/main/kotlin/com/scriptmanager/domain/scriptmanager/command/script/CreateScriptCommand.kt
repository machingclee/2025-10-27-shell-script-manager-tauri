package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.domain.infrastructure.Command

data class CreateScriptCommand(
    val folderId: Int,
    val name: String,
    val content: String
) : Command<ShellScriptResponse>

