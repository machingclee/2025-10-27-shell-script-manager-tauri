package com.scriptmanager.domain.ai.command.aiprofile

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.domain.infrastructure.Command

data class CreateAiProfileCommand(
    val name: String,
    val description: String
) : Command<AiProfile>
