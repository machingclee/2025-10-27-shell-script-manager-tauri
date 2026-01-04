package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.domain.infrastructure.Command

data class ReorderWorkspaceFoldersCommand(
    val workspaceId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

