package com.scriptmanager.domain.scriptmanager.command


data class ReorderWorkspaceFoldersCommand(
    val workspaceId: Int,
    val fromIndex: Int,
    val toIndex: Int
)

