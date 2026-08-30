package com.scriptmanager.boundedcontext.ai.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.ModelConfig

data class GetModelConfigsQuery(
    val aiProfileId: Int
) : Query<List<ModelConfig>>

