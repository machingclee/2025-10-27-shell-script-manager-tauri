package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.domain.infrastructure.Command

data class RemoveFolderFromWorkspaceCommand(
    val folderId: Int
) : Command<WorkspaceWithFoldersDTO>

