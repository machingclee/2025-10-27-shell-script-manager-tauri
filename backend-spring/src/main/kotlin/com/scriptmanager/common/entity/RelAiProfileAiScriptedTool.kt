package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "rel_aiprofile_aiscriptedtool")
class RelAiProfileAiScriptedTool(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "ai_profile_id", nullable = false)
    var aiProfileId: Int = 0,

    @Column(name = "ai_scripted_tool_id", nullable = false)
    var aiScriptedToolId: Int = 0
)
