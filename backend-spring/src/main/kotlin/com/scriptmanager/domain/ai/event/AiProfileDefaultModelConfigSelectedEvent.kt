package com.scriptmanager.domain.ai.event

data class AiProfileDefaultModelConfigSelectedEvent(
    val aiProfileId: Int,
    val modelConfigId: Int
)

