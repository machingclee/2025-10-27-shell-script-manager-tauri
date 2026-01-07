package com.scriptmanager.common.entity

import dev.james.processor.GenerateDTO
import jakarta.persistence.*
import org.hibernate.annotations.DynamicInsert
import org.hibernate.annotations.Generated

@Entity
@GenerateDTO
@DynamicInsert
@Table(name = "azure_model_config")
class AzureModelConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "azure_openai_api_key", nullable = false)
    var azureOpenaiApiKey: String = "", // e.g., "DvvBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

    @Column(name = "azure_openai_endpoint", nullable = false)
    var azureOpenaiEndpoint: String = "", // e.g., https://shellscriptmanager.openai.azure.com

    @Column(name = "azure_openai_api_version", nullable = false)
    var azureOpenaiApiVersion: String = "", // e.g., 2025-01-01-preview

    @Column(name = "azure_openai_model", nullable = false)
    var azureOpenaiModel: String = "", // e.g., gpt-4.1-mini

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null,

    @Column(name = "model_config_id")
    val modelConfigId: Int
) {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_config_id", insertable = false, updatable = false)
    var modelConfig: ModelConfig? = null
}
