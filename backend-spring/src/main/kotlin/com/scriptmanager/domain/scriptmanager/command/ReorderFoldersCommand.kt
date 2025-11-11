package com.scriptmanager.domain.scriptmanager.command


data class ReorderFoldersCommand(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
    val fromIndex: Int,
    val toIndex: Int
)

