package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.entity.WorkspaceDTO

data class WorkspaceUpdatedEvent(
    val workspace: WorkspaceDTO
)

