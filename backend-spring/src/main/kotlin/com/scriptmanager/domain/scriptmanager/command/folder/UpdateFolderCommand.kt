package com.scriptmanager.domain.scriptmanager.command.folder

import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateFolderCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<ScriptsFolderDTO>

