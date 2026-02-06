package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.domainutils.Command

data class CreateFolderInWorkspaceCommand(
    val workspaceId: Int,
    val name: String
) : Command<ScriptsFolder>

