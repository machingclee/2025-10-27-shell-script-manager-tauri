package com.scriptmanager.boundedcontext.ai.event

import com.scriptmanager.common.entity.ModelConfigDTO

data class ModelConfigUpdatedEvent(
    val modelConfigDTO: ModelConfigDTO
)

