package com.scriptmanager.domain.ai.command.aiprofile

import com.scriptmanager.domain.infrastructure.Command

data class ResetModelConfigOfAIProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

