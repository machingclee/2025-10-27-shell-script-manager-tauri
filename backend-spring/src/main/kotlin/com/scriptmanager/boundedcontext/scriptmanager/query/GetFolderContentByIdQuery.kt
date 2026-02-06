package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get folder content by its ID
 */
data class GetFolderContentByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

