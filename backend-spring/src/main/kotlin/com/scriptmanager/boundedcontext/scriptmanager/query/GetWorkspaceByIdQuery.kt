package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get a specific workspace by ID with all its folders
 */
data class GetWorkspaceByIdQuery(
    val workspaceId: Int
) : Query<WorkspaceWithFoldersDTO>

