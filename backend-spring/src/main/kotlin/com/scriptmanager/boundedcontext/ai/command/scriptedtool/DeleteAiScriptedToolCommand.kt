package com.scriptmanager.boundedcontext.ai.command.scriptedtool

import com.scriptmanager.common.domainutils.Command

data class DeleteAiScriptedToolCommand(
    val aiScriptedToolId: Int,
    val aiProfileId: Int
) : Command<Unit>

