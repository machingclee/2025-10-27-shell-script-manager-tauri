package com.scriptmanager.domain.ai.command

import com.scriptmanager.common.entity.AzureModelConfigDTO
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.common.entity.OpenAiModelConfigDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateModelConfigCommand(
    val modelConfigDTO: ModelConfigDTO,
    val openAiModelConfigDTO: OpenAiModelConfigDTO? = null,
    val azureModelConfigDTO: AzureModelConfigDTO? = null
) : Command<ModelConfig>

