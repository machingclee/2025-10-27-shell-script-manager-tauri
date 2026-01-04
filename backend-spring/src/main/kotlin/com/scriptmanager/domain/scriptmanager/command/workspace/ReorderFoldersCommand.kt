package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.domain.infrastructure.Command

data class ReorderFoldersCommand(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

