package com.scriptmanager.common.entity

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
    val id: Int? = null,

    @Column(name = "request_id", nullable = false)
    var requestId: String = "",

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "event_type", nullable = false)
    var eventType: String = "",

    @Column(name = "event", nullable = false, columnDefinition = "TEXT")
    var event: String = "",

    @Column(name = "request_user_email", nullable = false)
    var requestUserEmail: String = "",

    @Column(name = "success", nullable = false)
    var success: Boolean = true,

    @Column(name = "failure_reason", nullable = false)
    var failureReason: String = ""
)


