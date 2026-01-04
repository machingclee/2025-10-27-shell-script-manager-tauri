package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.domain.infrastructure.Command

data class CreateFolderInWorkspaceCommand(
    val workspaceId: Int,
    val name: String
) : Command<ScriptsFolderResponse>

