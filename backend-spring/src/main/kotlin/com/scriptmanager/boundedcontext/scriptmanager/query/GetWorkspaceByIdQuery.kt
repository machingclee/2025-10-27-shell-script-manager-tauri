package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO

/**
 * Query to get a specific workspace by ID with all its folders
 */
data class GetWorkspaceByIdQuery(
    val workspaceId: Int
) : Query<WorkspaceWithFoldersDTO>

