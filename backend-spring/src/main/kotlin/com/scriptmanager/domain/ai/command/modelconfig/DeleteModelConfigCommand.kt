package com.scriptmanager.domain.ai.command.modelconfig

import com.scriptmanager.domain.infrastructure.Command

data class DeleteModelConfigCommand(
    val modelConfigId: Int,
    val aiProfileId: Int
) : Command<Unit>

