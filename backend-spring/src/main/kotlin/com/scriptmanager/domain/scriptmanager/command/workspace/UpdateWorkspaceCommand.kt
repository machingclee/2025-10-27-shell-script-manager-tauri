package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateWorkspaceCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<WorkspaceDTO>

