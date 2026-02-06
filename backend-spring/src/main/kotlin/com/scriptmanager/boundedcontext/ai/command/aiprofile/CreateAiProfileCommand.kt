package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.common.domainutils.Command

data class CreateAiProfileCommand(
    val name: String,
    val description: String
) : Command<AiProfile>
