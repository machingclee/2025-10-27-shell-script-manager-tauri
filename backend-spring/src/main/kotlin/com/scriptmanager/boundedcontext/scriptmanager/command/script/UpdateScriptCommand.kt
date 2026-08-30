package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ShellScriptDTO

data class UpdateScriptCommand(
    val id: Int,
    val name: String,
    val command: String,
    val showShell: Boolean,
    val locked: Boolean
) : Command<ShellScriptDTO>

