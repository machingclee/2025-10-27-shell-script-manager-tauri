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
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @get:JvmName("getEntityId")
    val id: Int? = null,

    @Column(name = "request_id", nullable = false)
    @set:JvmName("setRequestIdRaw")
    var requestId: String = "",

    @Column(name = "created_at")
    @Generated
    @set:JvmName("setCreatedAtRaw")
    var createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "event_type", nullable = false)
    @set:JvmName("setEventTypeRaw")
    var eventType: String = "",

    @Column(name = "event", nullable = false, columnDefinition = "TEXT")
    @set:JvmName("setPayloadRaw")
    var payload: String = "",

    @Column(name = "request_user_email", nullable = false)
    @set:JvmName("setRequestUserEmailRaw")
    var requestUserEmail: String = "",

    @Column(name = "success", nullable = false)
    @get:JvmName("isSuccessFlag")
    @set:JvmName("setSuccessRaw")
    var success: Boolean = true,

    @Column(name = "failure_reason", nullable = false)
    @set:JvmName("setFailureReasonRaw")
    var failureReason: String = "",

    @Column(name = "event_order", nullable = false)
    @set:JvmName("setEventOrderRaw")
    var eventOrder: Int = 1
) : AuditEvent {

    override fun getId(): Int = id ?: 0

    override fun getSuccess(): Boolean = success

    override fun setCreatedAt(createdAt: Double) {
        this.createdAt = createdAt
    }

    override fun setEventType(eventType: String) {
        this.eventType = eventType
    }

    override fun setPayload(payload: String) {
        this.payload = payload
    }

    override fun setRequestUserEmail(requestUserEmail: String) {
        this.requestUserEmail = requestUserEmail
    }

    override fun setRequestId(requestId: String) {
        this.requestId = requestId
    }

    override fun setSuccess(success: Boolean) {
        this.success = success
    }

    override fun setFailureReason(failureReason: String) {
        this.failureReason = failureReason
    }

    override fun setEventOrder(eventOrder: Int) {
        this.eventOrder = eventOrder
    }
}
