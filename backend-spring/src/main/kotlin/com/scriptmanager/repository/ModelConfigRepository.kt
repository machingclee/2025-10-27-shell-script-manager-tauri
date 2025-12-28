package com.scriptmanager.repository

import com.scriptmanager.common.entity.ModelConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ModelConfigRepository : JpaRepository<ModelConfig, Int> {
}