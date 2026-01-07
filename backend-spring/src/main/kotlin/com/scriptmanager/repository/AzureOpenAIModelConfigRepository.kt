package com.scriptmanager.repository

import com.scriptmanager.common.entity.AzureModelConfig
import com.scriptmanager.common.entity.OpenAiModelConfig
import org.springframework.data.jpa.repository.JpaRepository

interface AzureOpenAIModelConfigRepository : JpaRepository<AzureModelConfig, Int> {
}
