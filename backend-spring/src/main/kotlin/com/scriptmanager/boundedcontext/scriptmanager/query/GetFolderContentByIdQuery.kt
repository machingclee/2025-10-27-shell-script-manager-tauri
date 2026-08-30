package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.ScriptsFolderResponse

/**
 * Query to get folder content by its ID
 */
data class GetFolderContentByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

