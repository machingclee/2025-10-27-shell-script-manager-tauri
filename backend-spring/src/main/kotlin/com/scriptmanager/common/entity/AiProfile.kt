package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.Cascade
import org.hibernate.annotations.CascadeType
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "ai_profile")
class AiProfile(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "selected_model_config_id")
    var selectedModelConfigId: Int? = null,

    @Column(name = "description", nullable = false)
    var description: String = "",

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null
) {
    @OneToMany(
        fetch = FetchType.LAZY,
        orphanRemoval = true
    )
    @Cascade(CascadeType.ALL)
    @JoinTable(
        name = "rel_aiprofile_modelconfig",
        joinColumns = [JoinColumn(name = "ai_profile_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "model_config_id", referencedColumnName = "id")]
    )
    var modelConfigs: MutableList<ModelConfig> = mutableListOf()

    @OneToMany(
        fetch = FetchType.LAZY,
        orphanRemoval = true
    )
    @Cascade(CascadeType.ALL)
    @JoinTable(
        name = "rel_aiprofile_aiscriptedtool",
        joinColumns = [JoinColumn(name = "ai_profile_id", referencedColumnName = "id")],
        inverseJoinColumns = [JoinColumn(name = "ai_scripted_tool_id", referencedColumnName = "id")]
    )
    var aiScriptedTools: MutableList<AiScriptedTool> = mutableListOf()


    @OneToOne
    @JoinColumn(name = "selected_model_config_id", insertable = false, updatable = false)
    var selectedModelConfig: ModelConfig? = null
}
