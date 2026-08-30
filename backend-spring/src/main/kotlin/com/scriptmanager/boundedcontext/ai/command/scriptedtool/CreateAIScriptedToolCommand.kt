package com.scriptmanager.boundedcontext.ai.command.scriptedtool

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.AiScriptedTool

data class CreateAIScriptedToolCommand(
    val name: String,
    val toolDescription: String,
    val scriptId: Int,
    val isEnabled: Boolean,
    val aiProfileId: Int
) : Command<AiScriptedTool>