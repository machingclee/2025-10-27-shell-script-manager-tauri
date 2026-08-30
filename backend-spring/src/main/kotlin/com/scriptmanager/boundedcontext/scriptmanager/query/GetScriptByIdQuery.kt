package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.ShellScriptDTO

/**
 * Query to get a specific script by ID
 */
data class GetScriptByIdQuery(
    val scriptId: Int
) : Query<ShellScriptDTO>

