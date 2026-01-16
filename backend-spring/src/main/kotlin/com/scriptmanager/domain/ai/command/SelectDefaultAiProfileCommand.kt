package com.scriptmanager.domain.ai.command

import com.scriptmanager.domain.infrastructure.Command

data class SelectDefaultAiProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

