package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ScriptsFolderDTO

data class UpdateFolderCommand(
    val id: Int,
    val name: String,
    val ordering: Int
) : Command<ScriptsFolderDTO>

