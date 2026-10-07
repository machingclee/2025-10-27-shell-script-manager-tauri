package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.EventsWithTotal

/**
 * Paged audit-log listing. Filters are optional; a null filter matches every row.
 * [sortOrder] re-sorts the page by event order ("asc" / "desc"); null keeps the
 * repository's created-at ordering.
 */
data class GetEventsQuery(
    val page: Int = 0,
    val limit: Int = 20,
    val requestId: String? = null,
    val success: Boolean? = null,
    val requestUserEmail: String? = null,
    val eventType: String? = null,
    val sortOrder: String? = null
) : Query<EventsWithTotal>
