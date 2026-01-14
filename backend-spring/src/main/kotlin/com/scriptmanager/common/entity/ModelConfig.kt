package com.scriptmanager.common.entity

import com.scriptmanager.common.dto.ModelConfigResponse
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

    @Embedded
    var modelSource: ModelSource,

    @Column(name = "created_at")
    @Generated
    val createdAt: Double? = null,

    @Column(name = "created_at_hk")
    @Generated
    val createdAtHk: String? = null
) {

    @OneToOne(mappedBy = "modelConfig", cascade = [CascadeType.ALL], orphanRemoval = true)
    var openAiModelConfig: OpenAiModelConfig? = null

    @OneToOne(mappedBy = "modelConfig", cascade = [CascadeType.ALL], orphanRemoval = true)
    var azureModelConfig: AzureModelConfig? = null

    enum class ModelSourceType {
        OPENAI,
        AZURE_OPENAI
    }

    @Embeddable
    class ModelSource(
        @Enumerated(EnumType.STRING)
        @Column(name = "model_source", nullable = false)
        var modelSource: ModelSourceType = ModelSourceType.AZURE_OPENAI
    )
}

fun ModelConfig.toResponse(): ModelConfigResponse {
    this.openAiModelConfig
    return ModelConfigResponse(
        modelConfigDTO = this.toDTO(),
        openAiModelConfigDTO = this.openAiModelConfig?.toDTO(),
        azureModelConfigDTO = this.azureModelConfig?.toDTO()
    )
}
