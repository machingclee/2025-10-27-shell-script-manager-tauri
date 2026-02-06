package com.scriptmanager.boundedcontext.ai.event

data class ModelConfigDeletedEvent(
    val modelConfigId: Int,
    val aiProfileId: Int
)

