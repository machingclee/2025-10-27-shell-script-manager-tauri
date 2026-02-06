package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateWorkspaceCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<WorkspaceDTO>

