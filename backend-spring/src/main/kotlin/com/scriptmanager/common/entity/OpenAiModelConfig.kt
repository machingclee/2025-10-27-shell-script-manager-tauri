package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "openai_model_config")
class OpenAiModelConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "openai_api_key", nullable = false)
    var openaiApiKey: String = "", // e.g., "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

    @Column(name = "openai_model", nullable = false)
    var openaiModel: String = "", // e.g., gpt-4, gpt-3.5-turbo

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "model_config_id")
    val modelConfigId: Int?
) {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_config_id", insertable = false, updatable = false)
    var modelConfig: ModelConfig? = null
}
