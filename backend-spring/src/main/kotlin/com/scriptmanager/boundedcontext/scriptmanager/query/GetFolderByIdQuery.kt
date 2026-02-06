package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get a folder by its ID
 */
data class GetFolderByIdQuery(
    val folderId: Int
) : Query<ScriptsFolderResponse>

