package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.domainutils.Command

data class AddSubfolderCommand(
    val parentFolderId: Int,
    val name: String
) : Command<ScriptsFolder>

