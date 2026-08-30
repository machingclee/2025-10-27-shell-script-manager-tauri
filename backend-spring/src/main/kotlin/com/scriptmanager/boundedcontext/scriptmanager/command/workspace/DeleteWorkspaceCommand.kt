package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteWorkspaceCommand(
    val id: Int
) : Command<Unit>

