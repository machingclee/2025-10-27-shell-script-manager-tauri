package com.scriptmanager.controller

import com.machingclee.domain.util.common.query.interfaces.QueryInvoker
import com.scriptmanager.boundedcontext.scriptmanager.query.GetEventsQuery
import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.EventsWithTotal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@Tag(name = "Event Log", description = "Audit event log listing")
@RequestMapping("/events")
class EventController(
    private val queryInvoker: QueryInvoker
) {

    @Operation(summary = "Get events page by page")
    @GetMapping
    fun getEvents(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") limit: Int,
        @RequestParam(required = false) requestId: String?,
        @RequestParam(required = false) success: Boolean?,
        @RequestParam(required = false) requestUserEmail: String?,
        @RequestParam(required = false) eventType: String?,
        @RequestParam(required = false) sortOrder: String?
    ): ApiResponse<EventsWithTotal> {
        val query = GetEventsQuery(
            page = page,
            limit = limit,
            requestId = requestId,
            success = success,
            requestUserEmail = requestUserEmail,
            eventType = eventType,
            sortOrder = sortOrder
        )
        return ApiResponse(queryInvoker.invoke(query))
    }
}
