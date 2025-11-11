package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.WorkspaceDTO

data class WorkspaceUpdatedEvent(
    val workspace: WorkspaceDTO
)

