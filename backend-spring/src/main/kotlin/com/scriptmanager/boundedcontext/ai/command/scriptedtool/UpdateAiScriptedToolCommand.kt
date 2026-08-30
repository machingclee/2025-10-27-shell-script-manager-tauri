package com.scriptmanager.boundedcontext.ai.command.scriptedtool

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.common.entity.AiScriptedToolDTO

data class UpdateAiScriptedToolCommand(
    val aiScriptedToolDTO: AiScriptedToolDTO
) : Command<AiScriptedTool>

