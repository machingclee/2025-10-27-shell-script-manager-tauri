package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get a specific script by ID
 */
data class GetScriptByIdQuery(
    val scriptId: Int
) : Query<ShellScriptDTO>

