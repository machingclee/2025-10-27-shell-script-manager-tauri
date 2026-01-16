package com.scriptmanager.domain.ai.command.aiprofile

import com.scriptmanager.domain.infrastructure.Command

data class SelectDefaultAiProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

