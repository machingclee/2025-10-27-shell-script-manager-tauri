package com.scriptmanager.boundedcontext.ai.command.scriptedtool

import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateAiScriptedToolCommand(
    val aiScriptedToolDTO: AiScriptedToolDTO
) : Command<AiScriptedTool>

