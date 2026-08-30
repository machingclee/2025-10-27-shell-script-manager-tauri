package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.HistoricalShellScriptResponse

/**
 * Query to get recent script execution histories
 */
data class GetScriptHistoriesQuery(
    val limit: Int = 10
) : Query<List<HistoricalShellScriptResponse>>

