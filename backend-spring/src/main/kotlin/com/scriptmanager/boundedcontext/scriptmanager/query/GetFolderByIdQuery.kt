package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.ScriptsFolderResponse

/**
 * Query to get a folder by its ID
 */
data class GetFolderByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

