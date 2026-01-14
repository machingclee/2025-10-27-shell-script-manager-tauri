package com.scriptmanager.domain.ai.command

import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateAiScriptedToolCommand(
    val aiScriptedToolDTO: AiScriptedToolDTO
) : Command<AiScriptedTool>

