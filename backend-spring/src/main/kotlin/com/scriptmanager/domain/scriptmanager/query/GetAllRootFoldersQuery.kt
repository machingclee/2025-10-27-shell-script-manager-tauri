package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get all root-level folders
 */
data class GetAllRootFoldersQuery(
    val dummy: Boolean = true // Queries must have at least one field
) : Query<List<ScriptsFolderResponse>>

