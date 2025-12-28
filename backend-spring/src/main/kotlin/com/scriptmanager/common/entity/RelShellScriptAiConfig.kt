package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "rel_shellscript_aiconfig")
class RelShellScriptAiConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "shell_script_id", nullable = false)
    var shellScriptId: Int = 0,

    @Column(name = "script_ai_config_id", nullable = false)
    var scriptAiConfigId: Int = 0
)
