package com.scriptmanager.domain.ai.command

import com.scriptmanager.domain.infrastructure.Command

data class DeleteAiScriptedToolCommand(
    val aiScriptedToolId: Int,
    val aiProfileId: Int
) : Command<Unit>

