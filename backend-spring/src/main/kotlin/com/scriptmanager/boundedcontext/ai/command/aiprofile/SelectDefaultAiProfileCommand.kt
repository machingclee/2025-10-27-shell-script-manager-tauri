package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.scriptmanager.common.domainutils.Command

data class SelectDefaultAiProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

