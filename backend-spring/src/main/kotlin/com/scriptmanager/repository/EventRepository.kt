package com.scriptmanager.repository

import com.machingclee.domain.util.common.interfaces.AuditEventRepository
import com.scriptmanager.common.entity.Event
import java.util.*
import org.springframework.stereotype.Repository


@Repository
interface EventRepository : AuditEventRepository<Event> {
    fun findAllByEventType(eventType: String): List<Event>
    fun findAllByRequestIdAndEventType(requestId: String, eventType: String): List<Event>
}
