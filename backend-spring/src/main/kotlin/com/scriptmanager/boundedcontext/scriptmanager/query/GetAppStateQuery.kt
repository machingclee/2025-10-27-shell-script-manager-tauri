package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.ApplicationStateDTO

/**
 * Query to get the application state
 */
data class GetAppStateQuery(
    val dummy: Boolean = true
) : Query<ApplicationStateDTO>

