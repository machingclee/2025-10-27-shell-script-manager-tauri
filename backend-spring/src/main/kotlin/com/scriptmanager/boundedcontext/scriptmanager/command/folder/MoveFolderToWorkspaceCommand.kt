package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.domainutils.Command

data class MoveFolderToWorkspaceCommand(
    val workspaceId: Int,
    val folderId: Int
) : Command<WorkspaceWithFoldersDTO>

