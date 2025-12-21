package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.domain.infrastructure.Command

data class CreateWorkspaceCommand(
    val name: String
) : Command<WorkspaceDTO>

