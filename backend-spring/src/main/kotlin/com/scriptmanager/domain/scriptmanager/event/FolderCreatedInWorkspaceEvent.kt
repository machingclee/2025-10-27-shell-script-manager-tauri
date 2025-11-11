package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.dto.ScriptsFolderResponse

data class FolderCreatedInWorkspaceEvent(
    val workspaceId: Int,
    val folder: ScriptsFolderResponse
)

