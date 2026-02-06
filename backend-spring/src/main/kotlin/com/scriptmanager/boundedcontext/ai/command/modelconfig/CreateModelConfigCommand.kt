package com.scriptmanager.boundedcontext.ai.command.modelconfig


import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.domainutils.Command

data class CreateModelConfigCommand(
    val name: String,
    val modelSourceType: ModelConfig.ModelSourceType,
    val aiprofileId: Int
) : Command<ModelConfig>