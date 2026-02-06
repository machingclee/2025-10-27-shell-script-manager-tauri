package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.domainutils.Command

data class MoveScriptToFolderCommand(
    val scriptId: Int,
    val targetFolderId: Int
) : Command<Unit>

