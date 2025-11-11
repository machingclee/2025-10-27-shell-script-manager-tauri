package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.entity.AppState
import com.scriptmanager.common.entity.AppStateDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.UpdateAppStateCommand
import com.scriptmanager.domain.scriptmanager.commandhandler.UpdateAppStateHandler
import com.scriptmanager.repository.AppStateRepository
import jakarta.transaction.Transactional
import org.springframework.web.bind.annotation.*

import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.ZonedDateTime

@RestController
class AppStateController(
    private val appStateRepository: AppStateRepository,
    private val commandInvoker: CommandInvoker,
    private val updateAppStateHandler: UpdateAppStateHandler
) {

    private val hkFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
    private val hkZone = ZoneId.of("Asia/Hong_Kong")

    @GetMapping("/app-state")
    fun getAppState(): ApiResponse<AppStateDTO> {
        var state = appStateRepository.findFirstByOrderByIdAsc()
        if (state == null) {
            val created = AppState(
                lastOpenedFolderId = null,
                darkMode = false
            )
            state = appStateRepository.save(created)
        }

        val dto = AppStateDTO(
            id = state?.id!!,
            lastOpenedFolderId = state.lastOpenedFolderId,
            darkMode = state.darkMode,
            createdAt = state.createdAt ?: 0.0,
            createdAtHk = state.createdAtHk ?: ""
        )

        return ApiResponse(result = dto)
    }

    @PutMapping("/app-state")
    @Transactional
    fun updateAppState(@RequestBody input: AppStateDTO): ApiResponse<AppStateDTO> {

        val command = UpdateAppStateCommand(
            id = input.id,
            lastOpenedFolderId = input.lastOpenedFolderId,
            darkMode = input.darkMode,
            createdAt = input.createdAt,
            createdAtHk = input.createdAtHk
        )

        val dto = commandInvoker.invoke(updateAppStateHandler, command)
        return ApiResponse(result = dto)
    }
}
