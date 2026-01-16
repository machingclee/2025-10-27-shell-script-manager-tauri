package com.scriptmanager.domain.ai.command.aiprofile

import com.scriptmanager.domain.infrastructure.Command

data class DeleteAiProfileCommand(
    val aiProfileId: Int
) : Command<Unit>

