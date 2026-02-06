package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.scriptmanager.common.domainutils.Command

data class ResetModelConfigOfAIProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

