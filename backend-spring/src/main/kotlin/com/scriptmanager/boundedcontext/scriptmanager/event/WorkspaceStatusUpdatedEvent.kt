package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.WorkspaceStatusName

data class WorkspaceStatusUpdatedEvent(
    val workspaceId: Int,
    val previousStatus: List<WorkspaceStatusName>,
    val currentStatus: List<WorkspaceStatusName>
)