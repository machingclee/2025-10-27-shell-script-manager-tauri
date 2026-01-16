package com.scriptmanager.domain.ai.event

data class AiScriptedToolDeletedEvent(
    val aiScriptedToolId: Int,
    val aiProfileId: Int
)

