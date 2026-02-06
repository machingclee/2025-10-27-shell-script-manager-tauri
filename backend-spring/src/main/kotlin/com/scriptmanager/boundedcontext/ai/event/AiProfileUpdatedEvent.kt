package com.scriptmanager.boundedcontext.ai.event

import com.scriptmanager.common.entity.AiProfileDTO

data class AiProfileUpdatedEvent(
    val aiProfile: AiProfileDTO
)

