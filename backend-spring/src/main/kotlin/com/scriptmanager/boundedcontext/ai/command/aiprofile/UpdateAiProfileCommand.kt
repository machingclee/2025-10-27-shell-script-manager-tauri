package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateAiProfileCommand(
    val aiProfileDTO: AiProfileDTO
) : Command<AiProfile>

