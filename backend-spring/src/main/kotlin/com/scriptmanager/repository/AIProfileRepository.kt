package com.scriptmanager.repository

import com.scriptmanager.common.entity.AiProfile
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface AIProfileRepository : JpaRepository<AiProfile, Int> {

    @Query(
        """
    SELECT ap FROM AiProfile ap
    LEFT JOIN FETCH ap.modelConfigs mc
    LEFT JOIN FETCH mc.openAiModelConfig
    LEFT JOIN FETCH mc.azureModelConfig
    WHERE ap.id = :id   
"""
    )
    fun findByIdFetchingConfigs(id: Int): AiProfile?
}