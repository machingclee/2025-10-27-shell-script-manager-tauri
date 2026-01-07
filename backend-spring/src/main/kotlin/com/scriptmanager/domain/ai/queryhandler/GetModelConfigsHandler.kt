package com.scriptmanager.domain.ai.queryhandler

import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.ai.query.GetModelConfigsQuery
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component

@Component
class GetModelConfigsHandler(
    private val aiProfileRepository: AIProfileRepository
) : QueryHandler<GetModelConfigsQuery, List<ModelConfigDTO>> {
    override fun handle(query: GetModelConfigsQuery): List<ModelConfigDTO> {
        val aiProfile = aiProfileRepository.findById(query.aiProfileId).orElseThrow {
            Exception("AI Profile with id ${query.aiProfileId} not found")
        }
        return aiProfile.modelConfigs.map { it.toDTO() }
    }
}

