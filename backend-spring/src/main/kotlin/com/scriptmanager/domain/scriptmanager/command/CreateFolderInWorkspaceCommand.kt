package com.scriptmanager.domain.scriptmanager.command

data class CreateFolderInWorkspaceCommand(
    val workspaceId: Int,
    val name: String
)

