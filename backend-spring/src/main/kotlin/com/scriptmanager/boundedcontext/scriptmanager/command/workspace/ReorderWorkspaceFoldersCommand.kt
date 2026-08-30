package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command

data class ReorderWorkspaceFoldersCommand(
    val workspaceId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

