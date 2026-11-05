package com.scriptmanager.controller

import com.machingclee.domain.util.common.interfaces.CommandBus
import com.machingclee.domain.util.common.query.interfaces.QueryBus
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.ReorderScriptsCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.script.*
import com.scriptmanager.boundedcontext.scriptmanager.event.ScriptExecutedEvent
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllScriptsQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetDraftScriptsQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptByIdQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.GetScriptHistoriesQuery
import com.scriptmanager.common.dto.*
import com.scriptmanager.common.dto.ScriptsWithTotal
import com.scriptmanager.common.dto.SearchScriptQuery
import com.scriptmanager.common.dto.SearchScriptRequest
import com.scriptmanager.common.entity.*
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.context.ApplicationEventPublisher
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/scripts")
@Tag(name = "Script Management", description = "APIs for managing shell scripts")
class ScriptController(
    private val commandBus: CommandBus,
    private val queryBus: QueryBus,
    private val applicationEventPublisher: ApplicationEventPublisher
) {

    @Operation(summary = "Get all scripts", description = "Retrieves all scripts ordered by their ordering value")
    @GetMapping
    fun getAllScripts(): ApiResponse<List<ShellScriptDTO>> {
        val query = GetAllScriptsQuery()
        val list = queryBus.send(query)
        return ApiResponse(list)
    }

    @Operation(summary = "Get script by ID", description = "Retrieves a specific script by its ID")
    @GetMapping("/{id}")
    fun getScriptById(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ShellScriptDTO> {
        val query = GetScriptByIdQuery(scriptId = id)
        val script = queryBus.send(query)
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
        val result = commandBus.send(command)
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
        val result = commandBus.send(command)
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
        return commandBus.send(command)
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
        return commandBus.send(command)
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
        commandBus.send(command)
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
        commandBus.send(command)
        return ApiResponse()
    }

    @Operation(
        summary = "Duplicate a script",
        description = "Creates a copy of a shell script or markdown script in the same folder"
    )
    @PostMapping("/{id}/duplicate")
    fun duplicateScript(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ShellScriptResponse> {
        val command = DuplicateScriptCommand(scriptId = id)
        val result = commandBus.send(command)
        return ApiResponse(result)
    }

    @Operation(summary = "Assign tags to a script", description = "Creates one assignment per tag and links each with assignedTags.add()")
    @PostMapping("/{id}/tags")
    fun assignTag(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int,
        @RequestBody request: AssignTagRequest
    ): ApiResponse<Unit> {
        commandBus.send(AssignTagToScriptCommand(scriptId = id, tagIds = request.tagIds))
        return ApiResponse()
    }

    @Operation(summary = "Remove tags from a script", description = "Deletes the assignment rows for the given tags")
    @DeleteMapping("/{id}/tags")
    fun unassignTag(
        @Parameter(description = "Script ID", required = true)
        @PathVariable id: Int,
        @RequestBody request: AssignTagRequest
    ): ApiResponse<Unit> {
        commandBus.send(UnassignTagFromScriptCommand(scriptId = id, tagIds = request.tagIds))
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
        commandBus.send(command)
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
        val histories = queryBus.send(query)
        return ApiResponse(histories)
    }

    @Operation(
        summary = "Search scripts",
        description = "Search scripts by name or command, by one tag, or by both (a script must match the text and the tag)"
    )
    @PostMapping("/search")
    fun searchScripts(@RequestBody request: SearchScriptRequest): ApiResponse<ScriptsWithTotal> {
        val query = SearchScriptQuery(
            search = request.search,
            tagId = request.tagId,
            page = request.page,
            size = request.size
        )
        val result = queryBus.send(query)
        return ApiResponse(result)
    }

    @Operation(
        summary = "Search scripts by tags",
        description = "Returns scripts that have any of the given tags"
    )
    @PostMapping("/search/by-tags")
    fun searchScriptsByTags(@RequestBody request: SearchScriptsByTagsRequest): ApiResponse<ScriptsWithTotal> {
        val query = SearchScriptsByTagsQuery(tagIds = request.tagIds, page = request.page, size = request.size)
        return ApiResponse(queryBus.send(query))
    }

    @Operation(summary = "Get draft scripts", description = "Retrieves all scripts that are not in any folder (parentFolder is null)")
    @GetMapping("/drafts")
    fun getDraftScripts(): ApiResponse<List<ShellScriptResponse>> {
        val query = GetDraftScriptsQuery()
        val result = queryBus.send(query)
        return ApiResponse(result)
    }
}
