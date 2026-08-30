package com.scriptmanager.boundedcontext.ai.command.scriptedtool

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteAiScriptedToolCommand(
    val aiScriptedToolId: Int,
    val aiProfileId: Int
) : Command<Unit>

