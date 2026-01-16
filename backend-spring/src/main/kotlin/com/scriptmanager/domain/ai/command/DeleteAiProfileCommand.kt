package com.scriptmanager.domain.ai.command

import com.scriptmanager.domain.infrastructure.Command

data class DeleteAiProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

