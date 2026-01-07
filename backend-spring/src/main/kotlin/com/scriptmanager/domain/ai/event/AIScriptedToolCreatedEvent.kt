package com.scriptmanager.domain.ai.event

import com.scriptmanager.common.entity.AiScriptedToolDTO

data class AIScriptedToolCreatedEvent(
    val aiprofileId: Int,
    val aiScriptedTool: AiScriptedToolDTO
)