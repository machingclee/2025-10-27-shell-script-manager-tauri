package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO

data class RemoveFolderFromWorkspaceCommand(
    val folderId: Int
) : Command<WorkspaceWithFoldersDTO>

