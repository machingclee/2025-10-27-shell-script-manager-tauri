package com.scriptmanager.boundedcontext.ai.query

import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.common.domainutils.Query

data class GetAIProfilesQuery(
    val dummy: String? = null
) : Query<List<AiProfileDTO>>
