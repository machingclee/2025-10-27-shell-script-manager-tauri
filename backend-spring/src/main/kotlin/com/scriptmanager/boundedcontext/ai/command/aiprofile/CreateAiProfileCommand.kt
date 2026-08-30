package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.AiProfile

data class CreateAiProfileCommand(
    val name: String,
    val description: String
) : Command<AiProfile>
