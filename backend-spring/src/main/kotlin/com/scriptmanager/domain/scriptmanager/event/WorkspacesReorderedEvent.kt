package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.WorkspaceDTO


data class WorkspacesReorderedEvent(
    val workspace: WorkspaceDTO,
    val fromIndex: Int,
    val toIndex: Int
)

