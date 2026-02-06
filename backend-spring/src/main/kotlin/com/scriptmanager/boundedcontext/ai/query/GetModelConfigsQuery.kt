package com.scriptmanager.boundedcontext.ai.query

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.domainutils.Query

data class GetModelConfigsQuery(
    val aiProfileId: Int
) : Query<List<ModelConfig>>

