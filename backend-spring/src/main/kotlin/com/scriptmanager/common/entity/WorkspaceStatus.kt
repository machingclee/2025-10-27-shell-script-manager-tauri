package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

enum class WorkspaceStatusName {
    ACTIVE,
    ARCHIVED
}

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "workspace_status")
class WorkspaceStatus(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "name", nullable = false)
    var name: WorkspaceStatusName = WorkspaceStatusName.ACTIVE
)
