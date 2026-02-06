package com.scriptmanager.boundedcontext.ai.event

import com.scriptmanager.common.entity.AiProfileDTO

data class AiProfileCreatedEvent(
    val aiprofile: AiProfileDTO
)