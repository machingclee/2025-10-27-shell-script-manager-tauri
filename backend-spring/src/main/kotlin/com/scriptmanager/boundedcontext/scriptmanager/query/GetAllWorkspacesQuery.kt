package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.WorkspaceResponse
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get all workspaces ordered by their ordering value
 */
data class GetAllWorkspacesQuery(
    val dummy: Boolean = true
) : Query<List<WorkspaceResponse>>

