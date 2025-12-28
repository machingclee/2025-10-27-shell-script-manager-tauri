package com.scriptmanager.repository

import com.scriptmanager.common.entity.AzureModelConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AzureModelConfigRepository : JpaRepository<AzureModelConfig, Int> {
}