package com.scriptmanager.domain.scriptmanager.command.script

import com.scriptmanager.domain.infrastructure.Command

data class MoveScriptToFolderCommand(
    val scriptId: Int,
    val targetFolderId: Int
) : Command<Unit>

