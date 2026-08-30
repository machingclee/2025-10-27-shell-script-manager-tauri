package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.machingclee.domain.util.common.interfaces.Command

data class SelectAiProfileDefaultModelConfigCommand(
    val aiProfileId: Int,
    val modelConfigId: Int
) : Command<Unit>

