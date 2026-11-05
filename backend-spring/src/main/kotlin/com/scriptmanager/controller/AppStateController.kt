package com.scriptmanager.controller

import com.machingclee.domain.util.common.interfaces.CommandBus
import com.machingclee.domain.util.common.query.interfaces.QueryBus
import com.scriptmanager.boundedcontext.scriptmanager.command.appstate.UpdateAppStateCommand
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAppStateQuery
import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.entity.ApplicationStateDTO
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.transaction.Transactional
import org.springframework.web.bind.annotation.*


@RestController
@Tag(name = "Application State", description = "APIs for managing application state")
class AppStateController(
    private val queryBus: QueryBus,
    private val commandBus: CommandBus
) {


    @Operation(summary = "Get application state", description = "Retrieves the current application state including dark mode, last opened folder, folder column width, and the shared history/log/search column width")
    @GetMapping("/app-state")
    fun getAppState(): ApiResponse<ApplicationStateDTO> {
        val query = GetAppStateQuery()
        val state = queryBus.send(query)
        return ApiResponse(result = state)
    }

    @Operation(summary = "Update application state", description = "Updates the application state including dark mode, last opened folder, folder column width, and the shared history/log/search column width")
    @PutMapping("/app-state")
    @Transactional
    fun updateAppState(@RequestBody input: ApplicationStateDTO): ApiResponse<ApplicationStateDTO> {

        val command = UpdateAppStateCommand(
            id = input.id,
            lastOpenedFolderId = input.lastOpenedFolderId,
            darkMode = input.darkMode,
            folderColumnWidth = input.folderColumnWidth,
            rightColumnWidth = input.rightColumnWidth,
            createdAt = input.createdAt,
            createdAtHk = input.createdAtHk
        )

        val dto = commandBus.send(command)
        return ApiResponse(result = dto)
    }
}
