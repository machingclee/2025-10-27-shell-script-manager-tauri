package com.scriptmanager.domain.ai.queryhandler

import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.ai.query.GetAIScriptedToolsQuery
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.repository.AIProfileRepository
import org.springframework.stereotype.Component

@Component
class GetAIScriptedToolsHandler(
    private val aiProfileRepository: AIProfileRepository
) : QueryHandler<GetAIScriptedToolsQuery, List<AiScriptedToolDTO>> {
    override fun handle(query: GetAIScriptedToolsQuery): List<AiScriptedToolDTO> {
        val aiProfile = aiProfileRepository.findById(query.aiProfileId).orElseThrow {
            Exception("AI Profile with id ${query.aiProfileId} not found")
        }
        return aiProfile.aiScriptedTools.map { it.toDTO() }
    }
}

