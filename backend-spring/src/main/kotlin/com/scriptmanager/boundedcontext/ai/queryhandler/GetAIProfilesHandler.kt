package com.scriptmanager.boundedcontext.ai.queryhandler

import com.scriptmanager.common.entity.AiProfileDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.boundedcontext.ai.query.GetAIProfilesQuery
import com.scriptmanager.common.domainutils.QueryHandler
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