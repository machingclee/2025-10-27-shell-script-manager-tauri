package com.scriptmanager.common.entity

import jakarta.persistence.*

@Entity
@Table(name = "application_state")
data class ApplicationState(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "last_opened_folder_id")
    var lastOpenedFolderId: Int? = null,

    @Column(name = "dark_mode", nullable = false)
    var darkMode: Boolean = false,

    @Column(name = "created_at", nullable = false)
    val createdAt: Double = 0.0,

    @Column(name = "created_at_hk", nullable = false)
    val createdAtHk: String = ""
)

