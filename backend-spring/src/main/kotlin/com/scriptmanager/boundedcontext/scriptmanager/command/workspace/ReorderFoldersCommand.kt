package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.domainutils.Command

data class ReorderFoldersCommand(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

