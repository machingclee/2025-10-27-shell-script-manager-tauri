package com.scriptmanager.domain.ai.queryhandler

import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.ai.query.GetAIProfilesQuery
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component

@Component
class GetAIProfilesHandler(
    private val aiProfileRepository: AIProfileRepository
) : QueryHandler<GetAIProfilesQuery, List<AiProfileDTO>> {
    override fun handle(query: GetAIProfilesQuery): List<AiProfileDTO> {
        return aiProfileRepository
            .findAll()
            .toList()
            .sortedByDescending {
                it.createdAt
            }.map {
                it.toDTO()
            }
    }
}