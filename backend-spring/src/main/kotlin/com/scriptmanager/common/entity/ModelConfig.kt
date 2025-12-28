package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "model_config")
class ModelConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "model_source", nullable = false)
    var modelSource: String = "AZURE_OPENAI", // Enum values: OPENAI, AZURE_OPENAI

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null
) {
    @OneToOne(mappedBy = "modelConfig", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var openAiModelConfig: OpenAiModelConfig? = null

    @OneToOne(mappedBy = "modelConfig", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var azureModelConfigs: AzureModelConfig? = null
}
