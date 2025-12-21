package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.entity.AppStateDTO
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get the application state
 */
data class GetAppStateQuery(
    val dummy: Boolean = true
) : Query<AppStateDTO>

