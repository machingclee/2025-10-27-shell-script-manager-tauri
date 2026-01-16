package com.scriptmanager.domain.ai.command.aiprofile

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateAiProfileCommand(
    val aiProfileDTO: AiProfileDTO
) : Command<AiProfile>

