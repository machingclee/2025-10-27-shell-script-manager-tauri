package com.scriptmanager.common.entity

import com.machingclee.domain.util.common.interfaces.AuditEvent
import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "event")
class Event(
    // `var` (not `val`): native Hibernate cannot write IDENTITY into a final field,
    // so getId() stayed 0 and domain-util logFailure(0) missed the row.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    var entityId: Int? = null,

    @Column(name = "request_id", nullable = false)
    var requestIdValue: String = "",

    @Column(name = "created_at")
    @Generated
    var createdAtValue: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "event_type", nullable = false)
    var eventTypeValue: String = "",

    @Column(name = "event", nullable = false, columnDefinition = "TEXT")
    var payloadValue: String = "",

    @Column(name = "request_user_email", nullable = false)
    var requestUserEmailValue: String = "",

    @Column(name = "success", nullable = false)
    var successFlag: Boolean = true,

    @Column(name = "failure_reason", nullable = false)
    var failureReasonValue: String = "",

    @Column(name = "event_order", nullable = false)
    var eventOrderValue: Int = 1
) : AuditEvent {

    override fun getId(): Int = entityId ?: 0

    override fun getSuccess(): Boolean = successFlag

    val requestId: String
        get() = requestIdValue

    val eventType: String
        get() = eventTypeValue

    val payload: String
        get() = payloadValue

    val failureReason: String
        get() = failureReasonValue

    override fun setCreatedAt(createdAt: Double) {
        this.createdAtValue = createdAt
    }

    override fun setEventType(eventType: String) {
        this.eventTypeValue = eventType
    }

    override fun setPayload(payload: String) {
        this.payloadValue = payload
    }

    override fun setRequestUserEmail(requestUserEmail: String) {
        this.requestUserEmailValue = requestUserEmail
    }

    override fun setRequestId(requestId: String) {
        this.requestIdValue = requestId
    }

    override fun setSuccess(success: Boolean) {
        this.successFlag = success
    }

    override fun setFailureReason(failureReason: String) {
        this.failureReasonValue = failureReason
    }

    override fun setEventOrder(eventOrder: Int) {
        this.eventOrderValue = eventOrder
    }
}
