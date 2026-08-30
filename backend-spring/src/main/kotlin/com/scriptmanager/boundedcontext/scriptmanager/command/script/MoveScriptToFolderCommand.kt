package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.machingclee.domain.util.common.interfaces.Command

data class MoveScriptToFolderCommand(
    val scriptId: Int,
    val targetFolderId: Int
) : Command<Unit>

