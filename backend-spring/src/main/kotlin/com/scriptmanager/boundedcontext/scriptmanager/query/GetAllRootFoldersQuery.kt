package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.ScriptsFolderResponse

/**
 * Query to get all root-level folders
 */
data class GetAllRootFoldersQuery(
    val dummy: Boolean = true // Queries must have at least one field
) : Query<List<ScriptsFolderResponse>>

