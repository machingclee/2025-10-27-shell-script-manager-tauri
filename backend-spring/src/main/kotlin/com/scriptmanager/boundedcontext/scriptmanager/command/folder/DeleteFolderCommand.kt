package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.scriptmanager.common.domainutils.Command

data class DeleteFolderCommand(
    val folderId: Int
) : Command<Unit>

