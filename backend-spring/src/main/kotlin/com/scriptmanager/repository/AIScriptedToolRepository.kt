package com.scriptmanager.repository

import com.scriptmanager.common.entity.AiScriptedTool
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AIScriptedToolRepository : JpaRepository<AiScriptedTool, Int> {
}