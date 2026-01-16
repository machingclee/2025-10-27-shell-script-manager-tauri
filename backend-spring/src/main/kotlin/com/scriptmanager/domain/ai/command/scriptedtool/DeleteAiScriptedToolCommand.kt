package com.scriptmanager.domain.ai.command.scriptedtool

import com.scriptmanager.domain.infrastructure.Command

data class DeleteAiScriptedToolCommand(
    val aiScriptedToolId: Int,
    val aiProfileId: Int
) : Command<Unit>

