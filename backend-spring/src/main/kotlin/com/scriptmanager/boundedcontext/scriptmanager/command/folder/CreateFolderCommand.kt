package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ScriptsFolder

data class CreateFolderCommand(
    val name: String
) : Command<ScriptsFolder>

