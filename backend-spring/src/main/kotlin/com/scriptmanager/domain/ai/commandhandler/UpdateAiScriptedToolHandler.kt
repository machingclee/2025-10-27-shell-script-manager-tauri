package com.scriptmanager.domain.ai.commandhandler

import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.domain.ai.command.UpdateAiScriptedToolCommand
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.repository.AIScriptedToolRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class UpdateAiScriptedToolHandler(
    private val aiScriptedToolRepository: AIScriptedToolRepository
) : CommandHandler<UpdateAiScriptedToolCommand, AiScriptedTool> {

    override fun handle(eventQueue: EventQueue, command: UpdateAiScriptedToolCommand): AiScriptedTool {
        val dto = command.aiScriptedToolDTO
        val aiScriptedTool = aiScriptedToolRepository.findByIdOrNull(dto.id)
            ?: throw Exception("AI Scripted Tool with id ${dto.id} not found")

        aiScriptedTool.name = dto.name
        aiScriptedTool.toolDescription = dto.toolDescription
        aiScriptedTool.isEnabled = dto.isEnabled
        aiScriptedTool.shellScriptId = dto.shellScriptId

        aiScriptedToolRepository.save(aiScriptedTool)
        return aiScriptedTool
    }
}

