package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command

data class ReorderFoldersCommand(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

