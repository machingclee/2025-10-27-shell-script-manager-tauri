package com.scriptmanager.boundedcontext.ai.query

import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.common.domainutils.Query

data class GetAIScriptedToolsQuery(
    val aiProfileId: Int
) : Query<List<AiScriptedToolDTO>>

