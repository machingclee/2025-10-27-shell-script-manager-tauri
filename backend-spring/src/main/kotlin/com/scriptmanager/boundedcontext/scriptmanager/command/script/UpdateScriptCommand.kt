package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateScriptCommand(
    val id: Int,
    val name: String,
    val command: String,
    val showShell: Boolean,
    val locked: Boolean
) : Command<ShellScriptDTO>

