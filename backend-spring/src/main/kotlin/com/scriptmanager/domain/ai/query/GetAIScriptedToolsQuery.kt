package com.scriptmanager.domain.ai.query

import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.domain.infrastructure.Query

data class GetAIScriptedToolsQuery(
    val aiProfileId: Int
) : Query<List<AiScriptedToolDTO>>

