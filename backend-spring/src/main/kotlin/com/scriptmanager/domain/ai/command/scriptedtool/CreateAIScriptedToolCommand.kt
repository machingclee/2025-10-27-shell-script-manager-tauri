package com.scriptmanager.domain.ai.command.scriptedtool

import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.domain.infrastructure.Command

data class CreateAIScriptedToolCommand(
    val name: String,
    val toolDescription: String,
    val scriptId: Int,
    val isEnabled: Boolean,
    val aiProfileId: Int
) : Command<AiScriptedTool>