package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetEventsQuery
import com.scriptmanager.common.dto.EventLogDTO
import com.scriptmanager.common.dto.EventsWithTotal
import com.scriptmanager.common.entity.Event
import com.scriptmanager.repository.EventRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component

@Component
class GetEventsQueryHandler(
    private val eventRepository: EventRepository
) : QueryHandler<GetEventsQuery, EventsWithTotal> {

    override fun handle(query: GetEventsQuery): EventsWithTotal {
        val pageable = buildPageRequest(query.page, query.limit, query.sortOrder)
        val eventPage = eventRepository.findByPageAndLimit(
            blankToNull(query.requestId),
            query.success,
            blankToNull(query.requestUserEmail),
            blankToNull(query.eventType),
            pageable
        )
        return EventsWithTotal(
            events = eventPage.content.map { it.toEventLogDTO() },
            total = eventPage.totalElements
        )
    }

    private fun buildPageRequest(page: Int, limit: Int, sortOrder: String?): PageRequest {
        val safeLimit = limit.coerceIn(1, 200)
        val safePage = page.coerceAtLeast(0)
        if (sortOrder == null) {
            return PageRequest.of(safePage, safeLimit)
        }
        val direction = if (sortOrder.equals("asc", ignoreCase = true)) {
            Sort.Direction.ASC
        } else {
            Sort.Direction.DESC
        }
        return PageRequest.of(safePage, safeLimit, Sort.by(direction, "eventOrderValue"))
    }

    private fun blankToNull(value: String?): String? = value?.takeIf { it.isNotBlank() }
}

private fun Event.toEventLogDTO() = EventLogDTO(
    id = getId(),
    createdAt = createdAtValue,
    createdAtHk = createdAtHk,
    requestId = requestId,
    eventType = eventType,
    payload = payload,
    eventOrder = eventOrderValue,
    requestUserEmail = requestUserEmailValue,
    success = successFlag,
    failureReason = failureReason
)
