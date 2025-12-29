package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.CreateAIProfileRequest
import com.scriptmanager.common.dto.CreateModelConfigRequest
import com.scriptmanager.common.entity.AiProfile
import com.scriptmanager.domain.ai.command.CreateAiProfileCommand
import com.scriptmanager.domain.ai.command.CreateModelConfigCommand
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.QueryInvoker
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/ai")
@Tag(name = "Health Check", description = "APIs for Agentic Solution")
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
    fun createModelConfig(@RequestBody request: CreateModelConfigRequest): ApiResponse<Any> {
        val (name, modelSource, aiprofileId) = request
        val createModelConfigCommand = CreateModelConfigCommand(
            name = name,
            modelSource = modelSource,
            aiprofileId = aiprofileId
        )
        val modelConfig = commandInvoker.invoke(createModelConfigCommand)
        return ApiResponse(modelConfig)
    }
}

