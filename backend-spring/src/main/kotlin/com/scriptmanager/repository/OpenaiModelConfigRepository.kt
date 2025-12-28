package com.scriptmanager.repository

import com.scriptmanager.common.entity.OpenAiModelConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface OpenaiModelConfigRepository : JpaRepository<OpenAiModelConfig, Int> {
}