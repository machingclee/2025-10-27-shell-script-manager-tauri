package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.domain.infrastructure.Command

data class CreateWorkspaceCommand(
    val name: String
) : Command<Workspace>

