package com.scriptmanager.domain.ai.event

data class AiProfileModelConfigResetEvent(
    val aiProfileId: Int,
    val newSelectedModelConfigId: Int?
)

