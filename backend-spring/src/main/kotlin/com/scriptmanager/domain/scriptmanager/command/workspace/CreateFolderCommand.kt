package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.domain.infrastructure.Command

data class CreateFolderCommand(
    val name: String
) : Command<ScriptsFolder>

