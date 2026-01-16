package com.scriptmanager.domain.ai.event

data class ModelConfigDeletedEvent(
    val modelConfigId: Int,
    val aiProfileId: Int
)

