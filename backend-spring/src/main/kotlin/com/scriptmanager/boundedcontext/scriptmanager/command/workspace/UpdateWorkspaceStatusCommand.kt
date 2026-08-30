package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.WorkspaceStatusName

data class UpdateWorkspaceStatusCommand(
    val workspaceid: Int,
    val newStatus: WorkspaceStatusName
) : Command<Unit>