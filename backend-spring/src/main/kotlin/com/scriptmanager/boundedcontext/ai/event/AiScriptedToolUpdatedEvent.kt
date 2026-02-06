package com.scriptmanager.boundedcontext.ai.event

import com.scriptmanager.common.entity.AiScriptedToolDTO

data class AiScriptedToolUpdatedEvent(
    val aiScriptedToolDTO: AiScriptedToolDTO
)

