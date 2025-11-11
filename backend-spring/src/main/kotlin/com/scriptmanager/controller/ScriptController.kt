package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.*
import com.scriptmanager.domain.scriptmanager.commandhandler.*
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/scripts")
class ScriptController(
    private val scriptRepository: ShellScriptRepository,
    private val commandInvoker: CommandInvoker,
    private val createScriptHandler: CreateScriptHandler,
    private val updateScriptHandler: UpdateScriptHandler,
    private val deleteScriptHandler: DeleteScriptHandler,
    private val reorderScriptsHandler: ReorderScriptsHandler,
    private val moveScriptToFolderHandler: MoveScriptToFolderHandler
) {

    @GetMapping
    fun getAllScripts(): ApiResponse<List<ShellScriptDTO>> {
        val list = scriptRepository.findAllByOrderByOrderingAsc().map { it.toDTO() }
        return ApiResponse(list)
    }

    @GetMapping("/{id}")
    fun getScriptById(@PathVariable id: Int): ApiResponse<ShellScript> {
        val script = scriptRepository.findByIdOrNull(id) ?: throw Exception("Script not found")
        return ApiResponse(script)
    }

    @PostMapping
    fun createScript(@RequestBody request: CreateScriptRequest): ApiResponse<ShellScriptResponse> {
        val command = CreateScriptCommand(
            folderId = request.folderId,
            name = request.name,
            content = request.content
        )
        val result = commandInvoker.invoke(createScriptHandler, command)
        return ApiResponse(result)
    }

    @PutMapping("/{id}")
    fun updateScript(
        @PathVariable id: Int,
        @RequestBody scriptDetails: ShellScriptDTO
    ): ShellScriptDTO {
        val command = UpdateScriptCommand(
            id = id,
            name = scriptDetails.name,
            command = scriptDetails.command,
            showShell = scriptDetails.showShell
        )
        return commandInvoker.invoke(updateScriptHandler, command)
    }

    @DeleteMapping("/{id}")
    fun deleteScript(
        @PathVariable id: Int,
        @RequestParam folderId: Int
    ): ApiResponse<Unit> {
        val command = DeleteScriptCommand(
            id = id,
            folderId = folderId
        )
        commandInvoker.invoke(deleteScriptHandler, command)
        return ApiResponse()
    }

    @PostMapping("/reorder")
    fun reorderScripts(@RequestBody request: ReorderScriptsRequest): ApiResponse<Unit> {
        val command = ReorderScriptsCommand(
            folderId = request.folderId,
            fromIndex = request.fromIndex,
            toIndex = request.toIndex
        )
        commandInvoker.invoke(reorderScriptsHandler, command)
        return ApiResponse()
    }

    @PutMapping("/{scriptId}/folder/{folderId}/move")
    fun moveScriptToFolder(
        @PathVariable scriptId: Int,
        @PathVariable folderId: Int
    ): ApiResponse<Unit> {
        val command = MoveScriptToFolderCommand(
            scriptId = scriptId,
            targetFolderId = folderId
        )
        commandInvoker.invoke(moveScriptToFolderHandler, command)
        return ApiResponse()
    }
}
