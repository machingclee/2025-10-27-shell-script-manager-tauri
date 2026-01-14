package com.scriptmanager.domain.ai.query

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.domain.infrastructure.Query

data class GetModelConfigsQuery(
    val aiProfileId: Int
) : Query<List<ModelConfig>>

