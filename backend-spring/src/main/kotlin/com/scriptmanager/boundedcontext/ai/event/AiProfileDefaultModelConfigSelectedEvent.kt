package com.scriptmanager.boundedcontext.ai.event

data class AiProfileDefaultModelConfigSelectedEvent(
    val aiProfileId: Int,
    val modelConfigId: Int
)

