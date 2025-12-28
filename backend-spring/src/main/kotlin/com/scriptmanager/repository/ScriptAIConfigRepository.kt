package com.scriptmanager.repository

import com.scriptmanager.common.entity.ScriptAiConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ScriptAIConfigRepository : JpaRepository<ScriptAiConfig, Int> {
}