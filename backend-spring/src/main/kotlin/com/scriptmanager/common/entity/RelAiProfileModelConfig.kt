package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "rel_aiprofile_modelconfig")
class RelAiProfileModelConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "ai_profile_id", nullable = false)
    var aiProfileId: Int = 0,

    @Column(name = "model_config_id", nullable = false)
    var modelConfigId: Int = 0
)
