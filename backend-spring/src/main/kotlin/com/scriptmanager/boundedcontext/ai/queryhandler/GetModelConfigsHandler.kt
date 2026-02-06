package com.scriptmanager.boundedcontext.ai.queryhandler

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.exception.AIException
import com.scriptmanager.boundedcontext.ai.query.GetModelConfigsQuery
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component

@Component
class GetModelConfigsHandler(
    private val aiProfileRepository: AIProfileRepository
) : QueryHandler<GetModelConfigsQuery, List<ModelConfig>> {
    override fun handle(query: GetModelConfigsQuery): List<ModelConfig> {
        val aiProfile = aiProfileRepository.findByIdFetchingConfigs(query.aiProfileId)
            ?: throw AIException("AI Profile with id ${query.aiProfileId} not found")
        return aiProfile.modelConfigs
    }
}

