package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.Workspace

data class CreateWorkspaceCommand(
    val name: String
) : Command<Workspace>

