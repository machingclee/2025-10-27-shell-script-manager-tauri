package com.scriptmanager.domain.ai.event

import com.scriptmanager.common.entity.ModelConfigDTO

data class ModelConfigCreatedEvent(
    val modelConfigDTO: ModelConfigDTO
)