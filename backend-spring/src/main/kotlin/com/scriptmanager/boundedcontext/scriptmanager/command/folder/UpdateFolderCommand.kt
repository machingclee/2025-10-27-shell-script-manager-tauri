package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateFolderCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<ScriptsFolderDTO>

