package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.domainutils.Command
import com.scriptmanager.common.entity.WorkspaceStatusName

data class UpdateWorkspaceStatusCommand(
    val workspaceid: Int,
    val newStatus: WorkspaceStatusName
) : Command<Unit>