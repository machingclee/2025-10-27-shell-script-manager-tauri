package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.dto.WorkspaceResponse
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get all workspaces ordered by their ordering value
 */
data class GetAllWorkspacesQuery(
    val dummy: Boolean = true
) : Query<List<WorkspaceResponse>>

