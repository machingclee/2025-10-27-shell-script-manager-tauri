package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@Table(name = "application_state")
class ApplicationState(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "last_opened_folder_id")
    var lastOpenedFolderId: Int? = null,

    @Column(name = "dark_mode")
    var darkMode: Boolean = false,

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null
)

