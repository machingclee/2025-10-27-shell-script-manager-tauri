package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get a folder by its ID
 */
data class GetFolderByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

