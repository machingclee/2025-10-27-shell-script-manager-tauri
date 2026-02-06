package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO

data class FolderRemovedFromWorkspaceEvent(
    val workspace: WorkspaceWithFoldersDTO,
    val folderId: Int
)

