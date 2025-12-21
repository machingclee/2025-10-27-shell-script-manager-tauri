package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.entity.AppStateDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.QueryInvoker
import com.scriptmanager.domain.scriptmanager.command.UpdateAppStateCommand
import com.scriptmanager.domain.scriptmanager.query.GetAppStateQuery
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.transaction.Transactional
import org.springframework.web.bind.annotation.*


@RestController
@Tag(name = "Application State", description = "APIs for managing application state")
class AppStateController(
    private val queryInvoker: QueryInvoker,
    private val commandInvoker: CommandInvoker
) {


    @Operation(summary = "Get application state", description = "Retrieves the current application state including dark mode and last opened folder")
    @GetMapping("/app-state")
    fun getAppState(): ApiResponse<AppStateDTO> {
        val query = GetAppStateQuery()
        val state = queryInvoker.invoke(query)
        return ApiResponse(result = state)
    }

    @Operation(summary = "Update application state", description = "Updates the application state including dark mode and last opened folder")
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

        val dto = commandInvoker.invoke(command)
        return ApiResponse(result = dto)
    }
}
