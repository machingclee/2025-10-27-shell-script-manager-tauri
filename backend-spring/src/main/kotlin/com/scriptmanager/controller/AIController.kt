package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.CreateAIProfileRequest
import com.scriptmanager.common.dto.CreateAIScripToolRequest
import com.scriptmanager.common.dto.CreateModelConfigRequest
import com.scriptmanager.common.entity.*
import com.scriptmanager.domain.ai.command.CreateAIScriptedToolCommand
import com.scriptmanager.domain.ai.command.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.CreateModelConfigCommand
import com.scriptmanager.domain.ai.query.GetAIProfilesQuery
import com.scriptmanager.domain.ai.query.GetAIScriptedToolsQuery
import com.scriptmanager.domain.ai.query.GetModelConfigsQuery
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.QueryInvoker
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/ai")
@Tag(name = "AI Resources", description = "APIs for creating configuration for solution")
class AIController(
    private val queryInvoker: QueryInvoker,
    private val commandInvoker: CommandInvoker
) {
    @PostMapping("/ai-profile")
    fun createApiProfile(@RequestBody request: CreateAIProfileRequest): ApiResponse<AiProfile> {
        val (name, description) = request
        val createAiProfielCommand = CreateAiProfileCommand(
            name = name,
            description = description
        )
        val aiprofile = commandInvoker.invoke(createAiProfielCommand)
        return ApiResponse(aiprofile)
    }

    // create modelconfig
    @PostMapping("/model-config")
    fun createModelConfig(@RequestBody request: CreateModelConfigRequest): ApiResponse<ModelConfigDTO> {
        val (name, modelSourceType, aiprofileId) = request
        val createModelConfigCommand = CreateModelConfigCommand(
            name = name,
            modelSourceType = modelSourceType,
            aiprofileId = aiprofileId
        )
        val modelConfig = commandInvoker.invoke(createModelConfigCommand)
        return ApiResponse(modelConfig.toDTO())
    }

    @PostMapping("/aiprofiles/{aiprofileId}/scripts/{scriptId}/ai-scripted-tool")
    @Transactional
    fun createAiScriptedTool(
        @PathVariable("scriptId") scriptId: Int,
        @PathVariable("aiprofileId") aiprofileId: Int,
        @RequestBody request: CreateAIScripToolRequest
    ): ApiResponse<AiScriptedToolDTO> {
        val (name, isEnabled, toolDescription) = request
        val command = CreateAIScriptedToolCommand(
            name = name,
            scriptId = scriptId,
            toolDescription = toolDescription,
            isEnabled = isEnabled,
            aiProfileId = aiprofileId
        )
        val scirptedTool = commandInvoker.invoke(command)
        return ApiResponse(scirptedTool.toDTO())
    }

    @GetMapping("/ai-profiles")
    fun getAIProfiles(): ApiResponse<List<AiProfileDTO>> {
        val query = GetAIProfilesQuery()
        val aiProfiles = queryInvoker.invoke(query)
        return ApiResponse(aiProfiles)
    }

    @GetMapping("/ai-profiles/{aiProfileId}/model-configs")
    fun getModelConfigs(@PathVariable("aiProfileId") aiProfileId: Int): ApiResponse<List<ModelConfigDTO>> {
        val query = GetModelConfigsQuery(aiProfileId = aiProfileId)
        val modelConfigs = queryInvoker.invoke(query)
        return ApiResponse(modelConfigs)
    }

    @GetMapping("/ai-profiles/{aiProfileId}/ai-scripted-tools")
    fun getAIScriptedTools(@PathVariable("aiProfileId") aiProfileId: Int): ApiResponse<List<AiScriptedToolDTO>> {
        val query = GetAIScriptedToolsQuery(aiProfileId = aiProfileId)
        val scriptedTools = queryInvoker.invoke(query)
        return ApiResponse(scriptedTools)
    }
}

