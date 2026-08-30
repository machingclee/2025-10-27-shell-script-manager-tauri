package com.scriptmanager.boundedcontext.ai.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.AiScriptedToolDTO

data class GetAIScriptedToolsQuery(
    val aiProfileId: Int
) : Query<List<AiScriptedToolDTO>>

