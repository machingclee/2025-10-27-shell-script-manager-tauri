package com.scriptmanager.boundedcontext.ai.command.modelconfig

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.AzureModelConfigDTO
import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.common.entity.OpenAiModelConfigDTO

data class UpdateModelConfigCommand(
    val modelConfigDTO: ModelConfigDTO,
    val openAiModelConfigDTO: OpenAiModelConfigDTO? = null,
    val azureModelConfigDTO: AzureModelConfigDTO? = null
) : Command<ModelConfig>

