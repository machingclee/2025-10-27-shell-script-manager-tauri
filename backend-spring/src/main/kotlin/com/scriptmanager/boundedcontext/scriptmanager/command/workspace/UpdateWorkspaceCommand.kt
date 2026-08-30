package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.WorkspaceDTO

data class UpdateWorkspaceCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<WorkspaceDTO>

