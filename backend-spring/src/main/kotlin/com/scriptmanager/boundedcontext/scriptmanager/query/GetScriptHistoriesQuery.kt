package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.HistoricalShellScriptResponse
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get recent script execution histories
 */
data class GetScriptHistoriesQuery(
    val limit: Int = 10
) : Query<List<HistoricalShellScriptResponse>>

