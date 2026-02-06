package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.domainutils.Command

data class DeleteWorkspaceCommand(
    val id: Int
) : Command<Unit>

