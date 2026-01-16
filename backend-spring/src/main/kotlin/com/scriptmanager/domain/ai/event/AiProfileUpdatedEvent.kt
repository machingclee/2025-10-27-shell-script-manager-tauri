package com.scriptmanager.domain.ai.event

import com.scriptmanager.common.entity.AiProfileDTO

data class AiProfileUpdatedEvent(
    val aiProfile: AiProfileDTO
)

