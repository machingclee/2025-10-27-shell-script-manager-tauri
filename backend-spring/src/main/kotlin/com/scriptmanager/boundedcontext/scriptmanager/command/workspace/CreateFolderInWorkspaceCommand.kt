package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ScriptsFolder

data class CreateFolderInWorkspaceCommand(
    val workspaceId: Int,
    val name: String
) : Command<ScriptsFolder>

