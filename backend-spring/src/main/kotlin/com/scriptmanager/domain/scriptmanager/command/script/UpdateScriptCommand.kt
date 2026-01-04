package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateScriptCommand(
    val id: Int,
    val name: String,
    val command: String,
    val showShell: Boolean,
    val locked: Boolean
) : Command<ShellScriptDTO>

