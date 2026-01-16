package com.scriptmanager.domain.service

import com.scriptmanager.common.exception.AIException
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.AIProfileRepository
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class ApplicationStateAIService(
    private val applicationStateRepository: ApplicationStateRepository,
    private val aiProfileRepository: AIProfileRepository
) {

    fun updateSelectedAiProfile(aiProfileId: Int) {
        aiProfileRepository.findByIdOrNull(aiProfileId)
            ?: throw AIException("AI Profile with id $aiProfileId not found")

        val applicationState = applicationStateRepository.findAll().firstOrNull()
            ?: throw ScriptManagerException("Application state not found")

        applicationState.selectAIProfile(aiProfileId)
        applicationStateRepository.save(applicationState)
    }
}

