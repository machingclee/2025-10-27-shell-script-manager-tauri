package com.scriptmanager.domain.ai.command

import com.scriptmanager.common.entity.ModelConfig
import com.scriptmanager.common.entity.ModelConfigDTO
import com.scriptmanager.domain.infrastructure.Command

data class CreateModelConfigCommand(
    val name: String,
    val modelSource: String,
    val aiprofileId: Int
) : Command<ModelConfigDTO>