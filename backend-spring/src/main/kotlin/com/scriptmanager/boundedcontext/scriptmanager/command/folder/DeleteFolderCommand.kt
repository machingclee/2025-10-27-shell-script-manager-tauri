package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteFolderCommand(
    val folderId: Int
) : Command<Unit>

