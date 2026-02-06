package com.scriptmanager.boundedcontext.ai.queryhandler

import com.scriptmanager.common.entity.AiScriptedToolDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.boundedcontext.ai.query.GetAIScriptedToolsQuery
import com.scriptmanager.common.domainutils.QueryHandler
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

