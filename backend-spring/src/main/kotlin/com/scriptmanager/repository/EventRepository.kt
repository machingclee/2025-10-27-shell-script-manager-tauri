package com.scriptmanager.repository

import com.machingclee.domain.util.common.interfaces.AuditEventRepository
import com.scriptmanager.common.entity.Event
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository


@Repository
interface EventRepository : AuditEventRepository<Event> {
    fun findAllByEventType(eventType: String): List<Event>
    fun findAllByRequestIdAndEventType(requestId: String, eventType: String): List<Event>

    // Property names are the entity's backing fields (requestIdValue, …), not the
    // AuditEvent getters — Spring Data resolves JPQL against the persistent fields.
    @Query(
        """
        select e from Event e
        where (:requestId is null or e.requestIdValue = :requestId)
          and (:success is null or e.successFlag = :success)
          and (:requestUserEmail is null or e.requestUserEmailValue like concat('%', :requestUserEmail, '%'))
          and (:eventType is null or e.eventTypeValue like concat('%', :eventType, '%'))
        order by e.createdAtValue desc, e.eventOrderValue desc
        """
    )
    fun findByPageAndLimit(
        @Param("requestId") requestId: String?,
        @Param("success") success: Boolean?,
        @Param("requestUserEmail") requestUserEmail: String?,
        @Param("eventType") eventType: String?,
        pageable: Pageable
    ): Page<Event>
}
