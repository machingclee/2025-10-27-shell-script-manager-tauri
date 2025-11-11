package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.WorkspaceDTO

data class WorkspaceCreatedEvent(
    val workspace: WorkspaceDTO
)

