package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO

data class FolderAddedToWorkspaceEvent(
    val workspace: WorkspaceWithFoldersDTO
)

