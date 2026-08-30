package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.machingclee.domain.util.common.interfaces.Command

data class ResetModelConfigOfAIProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

