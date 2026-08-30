package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.WorkspaceResponse

/**
 * Query to get all workspaces ordered by their ordering value
 */
data class GetAllWorkspacesQuery(
    val dummy: Boolean = true
) : Query<List<WorkspaceResponse>>

