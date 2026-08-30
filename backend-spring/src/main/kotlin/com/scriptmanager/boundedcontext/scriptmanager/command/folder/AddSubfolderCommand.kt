package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ScriptsFolder

data class AddSubfolderCommand(
    val parentFolderId: Int,
    val name: String
) : Command<ScriptsFolder>

