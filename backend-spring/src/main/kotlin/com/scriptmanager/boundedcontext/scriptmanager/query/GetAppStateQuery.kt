package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.entity.ApplicationStateDTO
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get the application state
 */
data class GetAppStateQuery(
    val dummy: Boolean = true
) : Query<ApplicationStateDTO>

