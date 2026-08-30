package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.entity.AiProfileDTO

data class UpdateAiProfileCommand(
    val aiProfileDTO: AiProfileDTO
) : Command<AiProfile>

