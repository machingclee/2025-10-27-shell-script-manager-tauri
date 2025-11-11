package com.scriptmanager.domain.scriptmanager.command

data class MoveScriptToFolderCommand(
    val scriptId: Int,
    val targetFolderId: Int
)

