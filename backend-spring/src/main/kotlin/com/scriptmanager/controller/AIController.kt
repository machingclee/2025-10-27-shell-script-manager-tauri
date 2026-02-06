package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.*
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.CreateAIScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.CreateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.CreateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.DeleteAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.DeleteAiScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.DeleteModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectAiProfileDefaultModelConfigCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.SelectDefaultAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.aiprofile.UpdateAiProfileCommand
import com.scriptmanager.boundedcontext.ai.command.scriptedtool.UpdateAiScriptedToolCommand
import com.scriptmanager.boundedcontext.ai.command.modelconfig.UpdateModelConfigCommand
import com.scriptmanager.boundedcontext.ai.query.GetAIProfilesQuery
import com.scriptmanager.boundedcontext.ai.query.GetAIScriptedToolsQuery
import com.scriptmanager.boundedcontext.ai.query.GetModelConfigsQuery
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.QueryInvoker
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/ai")
@Tag(name = "AI Resources", description = "APIs for creating configuration for solution")
class AIController(
    private val queryInvoker: QueryInvoker,
    private val commandInvoker: CommandInvoker
) {
    @PostMapping("/ai-profile")
    fun createAIProfile(@RequestBody request: CreateAIProfileRequest): ApiResponse<AiProfileDTO> {
        val (name, description) = request
        val createAiProfielCommand = CreateAiProfileCommand(
            name = name,
            description = description
        )
        val aiprofile = commandInvoker.invoke(createAiProfielCommand)
        return ApiResponse(aiprofile.toDTO())
    }

    @PutMapping("/ai-profile")
    fun updateAIProfile(@RequestBody request: UpdateAIProfileRequest): ApiResponse<AiProfileDTO> {
        val command = UpdateAiProfileCommand(
            aiProfileDTO = request.aiProfileDTO
        )
        val aiProfile = commandInvoker.invoke(command)
        return ApiResponse(aiProfile.toDTO())
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

    @PutMapping("/model-config")
    fun updateModelConfig(@RequestBody request: UpdateModelConfigRequest): ApiResponse<ModelConfigDTO> {
        val command = UpdateModelConfigCommand(
            modelConfigDTO = request.modelConfigDTO,
            openAiModelConfigDTO = request.openAiModelConfigDTO,
            azureModelConfigDTO = request.azureModelConfigDTO
        )
        val modelConfig = commandInvoker.invoke(command)
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

    @PutMapping("/ai-scripted-tool")
    fun updateAiScriptedTool(@RequestBody request: UpdateAIScriptedToolRequest): ApiResponse<AiScriptedToolDTO> {
        val command = UpdateAiScriptedToolCommand(
            aiScriptedToolDTO = request.aiScriptedToolDTO
        )
        val aiScriptedTool = commandInvoker.invoke(command)
        return ApiResponse(aiScriptedTool.toDTO())
    }

    @GetMapping("/ai-profiles")
    fun getAIProfiles(): ApiResponse<List<AiProfileDTO>> {
        val query = GetAIProfilesQuery()
        val aiProfiles = queryInvoker.invoke(query)
        return ApiResponse(aiProfiles)
    }

    @GetMapping("/ai-profiles/{aiProfileId}/model-configs")
    fun getModelConfigs(@PathVariable("aiProfileId") aiProfileId: Int): ApiResponse<List<ModelConfigResponse>> {
        val query = GetModelConfigsQuery(aiProfileId = aiProfileId)
        val modelConfigs = queryInvoker.invoke(query)
        val modelConfigResponses = modelConfigs.map { it.toResponse() }
        return ApiResponse(modelConfigResponses)
    }

    @GetMapping("/ai-profiles/{aiProfileId}/ai-scripted-tools")
    fun getAIScriptedTools(@PathVariable("aiProfileId") aiProfileId: Int): ApiResponse<List<AiScriptedToolDTO>> {
        val query = GetAIScriptedToolsQuery(aiProfileId = aiProfileId)
        val scriptedTools = queryInvoker.invoke(query)
        return ApiResponse(scriptedTools)
    }

    @DeleteMapping("/ai-profile/{id}")
    fun deleteAIProfile(@PathVariable id: Int): ApiResponse<Unit> {
        val command = DeleteAiProfileCommand(aiProfileId = id)
        commandInvoker.invoke(command)
        return ApiResponse(Unit)
    }

    @DeleteMapping("/model-config/{id}")
    fun deleteModelConfig(
        @PathVariable id: Int,
        @RequestParam aiProfileId: Int
    ): ApiResponse<Unit> {
        val command = DeleteModelConfigCommand(
            modelConfigId = id,
            aiProfileId = aiProfileId
        )
        commandInvoker.invoke(command)
        return ApiResponse(Unit)
    }

    @DeleteMapping("/ai-scripted-tool/{id}")
    fun deleteAiScriptedTool(
        @PathVariable id: Int,
        @RequestParam aiProfileId: Int
    ): ApiResponse<Unit> {
        val command = DeleteAiScriptedToolCommand(
            aiScriptedToolId = id,
            aiProfileId = aiProfileId
        )
        commandInvoker.invoke(command)
        return ApiResponse(Unit)
    }

    @PutMapping("/select-default-ai-profile/{aiProfileId}")
    fun selectDefaultAiProfile(@PathVariable aiProfileId: Int): ApiResponse<Unit> {
        val command = SelectDefaultAiProfileCommand(aiProfileId = aiProfileId)
        commandInvoker.invoke(command)
        return ApiResponse(Unit)
    }


    @PutMapping("/default-model-config")
    fun selectDefaultModelConfigByRequest(
        @RequestBody request: SelectDefaultModelConfigRequest
    ): ApiResponse<Unit> {
        val command = SelectAiProfileDefaultModelConfigCommand(
            aiProfileId = request.aiProfileId,
            modelConfigId = request.modelConfigId
        )
        commandInvoker.invoke(command)
        return ApiResponse(Unit)
    }
}

