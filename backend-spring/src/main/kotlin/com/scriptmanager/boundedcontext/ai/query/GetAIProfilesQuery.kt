package com.scriptmanager.boundedcontext.ai.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.AiProfileDTO

data class GetAIProfilesQuery(
    val dummy: String? = null
) : Query<List<AiProfileDTO>>
