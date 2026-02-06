package com.scriptmanager.boundedcontext.ai.event

import com.scriptmanager.common.entity.ModelConfigDTO

data class AiProfileModelConfigResetEvent(
    val aiProfileId: Int,
    val newSelectedModelConfigDTO: ModelConfigDTO?
)

