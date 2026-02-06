package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.entity.WorkspaceDTO

data class WorkspaceCreatedEvent(
    val workspace: WorkspaceDTO
)

