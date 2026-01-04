package com.scriptmanager.domain.scriptmanager.command.folder

import com.scriptmanager.domain.infrastructure.Command

data class DeleteFolderCommand(
    val folderId: Int
) : Command<Unit>

