package com.scriptmanager.domain.scriptmanager.command

data class AddFolderToWorkspaceCommand(
    val workspaceId: Int,
    val folderId: Int
)

