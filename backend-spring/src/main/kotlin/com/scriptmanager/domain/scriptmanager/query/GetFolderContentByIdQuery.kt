package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get folder content by its ID
 */
data class GetFolderContentByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

