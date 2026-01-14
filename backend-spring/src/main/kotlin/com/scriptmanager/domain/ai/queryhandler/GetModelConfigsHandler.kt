package com.scriptmanager.domain.ai.queryhandler

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.domain.ai.query.GetModelConfigsQuery
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component

@Component
class GetModelConfigsHandler(
    private val aiProfileRepository: AIProfileRepository
) : QueryHandler<GetModelConfigsQuery, List<ModelConfig>> {
    override fun handle(query: GetModelConfigsQuery): List<ModelConfig> {
        val aiProfile = aiProfileRepository.findByIdFetchingConfigs(query.aiProfileId)
            ?: throw Exception("AI Profile with id ${query.aiProfileId} not found")
        return aiProfile.modelConfigs
    }
}

