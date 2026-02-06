package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.*
import com.scriptmanager.common.domainutils.CommandInvoker
import com.scriptmanager.common.domainutils.QueryInvoker
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.ReorderScriptsCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.script.*
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptExecutedEvent
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllScriptsQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptByIdQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptHistoriesQuery
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.context.ApplicationEventPublisher
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/scripts")
@Tag(name = "Script Management", description = "APIs for managing shell scripts")
class ScriptController(
    private val commandInvoker: CommandInvoker,
    private val queryInvoker: QueryInvoker,
    private val applicationEventPublisher: ApplicationEventPublisher
) {

    @Operation(summary = "Get all scripts", description = "Retrieves all scripts ordered by their ordering value")
    @GetMapping
    fun getAllScripts(): ApiResponse<List<ShellScriptDTO>> {
        val query = GetAllScriptsQuery()
        val list = queryInvoker.invoke(query)
        return ApiResponse(list)
    }

    @Operation(summary = "Get script by ID", description = "Retrieves a specific script by its ID")
    @GetMapping("/{id}")
    fun getScriptById(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ShellScriptDTO> {
        val query = GetScriptByIdQuery(scriptId = id)
        val script = queryInvoker.invoke(query)
        return ApiResponse(script)
    }

    @Operation(summary = "Create a new script", description = "Creates a new shell script in a folder")
    @PostMapping
    fun createScript(@RequestBody request: CreateScriptRequest): ApiResponse<ShellScriptResponse> {
        val command = CreateScriptCommand(
            folderId = request.folderId,
            name = request.name,
            content = request.content
        )
        val result = commandInvoker.invoke(command)
        return ApiResponse(result)
    }


    @Operation(summary = "Create a new markdown", description = "Creates a new markdown note in a folder")
    @PostMapping("/markdowns")
    fun createMarkdown(@RequestBody request: CreateMarkdownRequest): ApiResponse<ShellScriptResponse> {
        val command = CreateMarkdownCommand(
            folderId = request.folderId,
            name = request.name,
            content = request.content
        )
        val result = commandInvoker.invoke(command)
        return ApiResponse(result)
    }

    @Operation(summary = "Update a script", description = "Updates an existing script's name, command, and settings")
    @PutMapping("/{id}")
    fun updateScript(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int,
        @RequestBody scriptDetails: ShellScriptDTO
    ): ShellScriptDTO {
        val command = UpdateScriptCommand(
            id = id,
            name = scriptDetails.name,
            command = scriptDetails.command,
            showShell = scriptDetails.showShell,
            locked = scriptDetails.locked!!
        )
        return commandInvoker.invoke(command)
    }

    @Operation(summary = "Update a markdown", description = "Updates an existing markdown note's content")
    @PutMapping("/markdowns/{id}")
    fun updateMarkdownScript(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int,
        @RequestBody scriptDetails: ShellScriptDTO
    ): ShellScriptDTO {
        val command = UpdateMarkdownCommand(
            id,
            name = scriptDetails.name,
            content = scriptDetails.command
        )
        return commandInvoker.invoke(command)
    }

    @Operation(summary = "Delete a script", description = "Deletes a script from a folder")
    @DeleteMapping("/{id}")
    fun deleteScript(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Folder ID containing the script", required = true)
        @RequestParam folderId: Int
    ): ApiResponse<Unit> {
        val command = DeleteScriptCommand(
            scriptId = id,
            folderId = folderId
        )
        commandInvoker.invoke(command)
        return ApiResponse()
    }

    @Operation(summary = "Reorder scripts", description = "Reorders scripts within a folder by moving a script from one position to another")
    @PostMapping("/reorder")
    fun reorderScripts(@RequestBody request: ReorderScriptsRequest): ApiResponse<Unit> {
        val command = ReorderScriptsCommand(
            folderId = request.folderId,
            fromIndex = request.fromIndex,
            toIndex = request.toIndex
        )
        commandInvoker.invoke(command)
        return ApiResponse()
    }

    @Operation(summary = "Move script to folder", description = "Moves a script to a different folder")
    @PutMapping("/{scriptId}/folder/{folderId}/move")
    fun moveScriptToFolder(
        @Parameter(description = "Script ID", required = true)
        @PathVariable scriptId: Int,
        @Parameter(description = "Target folder ID", required = true)
        @PathVariable folderId: Int
    ): ApiResponse<Unit> {
        val command = MoveScriptToFolderCommand(
            scriptId = scriptId,
            targetFolderId = folderId
        )
        commandInvoker.invoke(command)
        return ApiResponse()
    }

    @Operation(
        summary = "Record script execution",
        description = "Publishes a domain event indicating a script was executed successfully (called by external system). The event triggers a policy that automatically creates the history record."
    )
    @PostMapping("/events/script-executed/{scriptId}")
    fun recordScriptExecution(
        @Parameter(description = "Script ID that was executed", required = true)
        @PathVariable scriptId: Int
    ): ApiResponse<Unit> {
        // Publish domain event - this is the integration point with external backend
        // The event will be caught by RecordExecutedCommandIntoHistoryPolicy
        // which will invoke CreateScriptHistoryCommand as a side effect
        applicationEventPublisher.publishEvent(ScriptExecutedEvent(scriptId))
        return ApiResponse()
    }

    @Operation(summary = "Get script histories", description = "Retrieves recent script execution histories")
    @GetMapping("/history")
    fun getScriptHistories(): ApiResponse<List<HistoricalShellScriptResponse>> {
        val query = GetScriptHistoriesQuery()
        val histories = queryInvoker.invoke(query)
        return ApiResponse(histories)
    }
}
