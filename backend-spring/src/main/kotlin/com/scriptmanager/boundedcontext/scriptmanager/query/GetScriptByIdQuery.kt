package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get a specific script by ID
 */
data class GetScriptByIdQuery(
    val scriptId: Int
) : Query<ShellScriptDTO>

