package com.scriptmanager.domain.ai.command

import com.scriptmanager.domain.infrastructure.Command

data class SelectAiProfileDefaultModelConfigCommand(
    val aiProfileId: Int,
    val modelConfigId: Int
) : Command<Unit>

