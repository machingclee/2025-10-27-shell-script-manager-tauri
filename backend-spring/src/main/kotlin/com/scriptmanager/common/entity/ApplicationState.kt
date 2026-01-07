package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import javax.annotation.processing.Generated

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
    val createdAtHk: String? = null,

    @Column(name = "selected_aiprofile_id")
    var selectedAiProfileId: Int? = null
) {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_aiprofile_id", updatable = false, insertable = false)
    var selectedAiProfile: AiProfile? = null
}

