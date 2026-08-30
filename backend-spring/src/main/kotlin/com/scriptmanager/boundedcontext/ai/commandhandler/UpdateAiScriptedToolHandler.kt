package com.scriptmanager.boundedcontext.ai.commandhandler

import com.machingclee.domain.util.common.interfaces.CommandHandler
import com.machingclee.domain.util.common.interfaces.EventQueue
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.UpdateAiScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.event.AiScriptedToolUpdatedEvent
import com.scriptmanager.common.entity.AiScriptedTool
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.AIException
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
            ?: throw AIException("AI Scripted Tool with id ${dto.id} not found")

        aiScriptedTool.name = dto.name
        aiScriptedTool.toolDescription = dto.toolDescription
        aiScriptedTool.isEnabled = dto.isEnabled
        aiScriptedTool.shellScriptId = dto.shellScriptId

        aiScriptedToolRepository.save(aiScriptedTool)

        eventQueue.add(AiScriptedToolUpdatedEvent(aiScriptedToolDTO = aiScriptedTool.toDTO()))

        return aiScriptedTool
    }

}
