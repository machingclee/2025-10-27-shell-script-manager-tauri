package com.scriptmanager.boundedcontext.ai.command.modelconfig


import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ModelConfig

data class CreateModelConfigCommand(
    val name: String,
    val modelSourceType: ModelConfig.ModelSourceType,
    val aiprofileId: Int
) : Command<ModelConfig>