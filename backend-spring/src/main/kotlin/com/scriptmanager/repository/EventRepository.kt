package com.scriptmanager.repository

import com.scriptmanager.common.entity.Event
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*


@Repository
interface EventRepository : JpaRepository<Event, Int> {
    fun findAllByRequestIdAndEventType(requestId: String, eventType: String): List<Event>
}
