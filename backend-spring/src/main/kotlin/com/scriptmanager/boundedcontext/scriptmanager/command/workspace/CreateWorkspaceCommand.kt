package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.domainutils.Command

data class CreateWorkspaceCommand(
    val name: String
) : Command<Workspace>

