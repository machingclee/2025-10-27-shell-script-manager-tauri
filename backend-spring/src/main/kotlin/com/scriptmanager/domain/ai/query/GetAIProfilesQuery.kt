package com.scriptmanager.domain.ai.query

import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.domain.infrastructure.Query

data class GetAIProfilesQuery(
    val dummy: String? = null
) : Query<List<AiProfileDTO>>
