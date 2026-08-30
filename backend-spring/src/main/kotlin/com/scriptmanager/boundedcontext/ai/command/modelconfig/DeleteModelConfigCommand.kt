package com.scriptmanager.boundedcontext.ai.command.modelconfig

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteModelConfigCommand(
    val modelConfigId: Int,
    val aiProfileId: Int
) : Command<Unit>

