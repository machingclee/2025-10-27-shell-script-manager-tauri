package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO

data class FolderAddedToWorkspaceEvent(
    val workspace: WorkspaceWithFoldersDTO
)

