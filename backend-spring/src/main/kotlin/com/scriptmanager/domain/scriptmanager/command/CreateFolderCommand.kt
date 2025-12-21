package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.domain.infrastructure.Command

data class CreateFolderCommand(
    val name: String
) : Command<ScriptsFolderDTO>

