package com.scriptmanager.boundedcontext.ai.command.aiprofile

import com.scriptmanager.common.domainutils.Command

data class SelectAiProfileDefaultModelConfigCommand(
    val aiProfileId: Int,
    val modelConfigId: Int
) : Command<Unit>

