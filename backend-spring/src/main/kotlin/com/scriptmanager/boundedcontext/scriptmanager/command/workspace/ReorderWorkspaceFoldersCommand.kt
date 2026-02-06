package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.domainutils.Command

data class ReorderWorkspaceFoldersCommand(
    val workspaceId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

