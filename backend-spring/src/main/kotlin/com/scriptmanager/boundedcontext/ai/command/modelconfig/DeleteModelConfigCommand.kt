package com.scriptmanager.boundedcontext.ai.command.modelconfig

import com.scriptmanager.common.domainutils.Command

data class DeleteModelConfigCommand(
    val modelConfigId: Int,
    val aiProfileId: Int
) : Command<Unit>

