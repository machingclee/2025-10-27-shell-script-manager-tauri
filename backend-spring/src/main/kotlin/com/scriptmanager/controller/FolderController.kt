package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.*
import com.scriptmanager.domain.scriptmanager.commandhandler.*
import com.scriptmanager.repository.ScriptsFolderRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/folders")
@Tag(name = "Folder Management", description = "APIs for managing script folders")
class FolderController(
    private val folderRepository: ScriptsFolderRepository,
    private val commandInvoker: CommandInvoker,
    private val createFolderHandler: CreateFolderHandler,
    private val updateFolderHandler: UpdateFolderHandler,
    private val deleteFolderHandler: DeleteFolderHandler,
    private val reorderFoldersHandler: ReorderFoldersHandler,
    private val addSubfolderHandler: AddSubfolderHandler
) {

    @Operation(summary = "Get all folders", description = "Retrieves all script folders ordered by their ordering value")
    @GetMapping
    fun getAllFolders(): ApiResponse<List<ScriptsFolderResponse>> {
        val folders = folderRepository.findAllRootLevelFolder().map { it.toResponse() }
        return ApiResponse(folders)
    }

    @Operation(summary = "Get folder by ID", description = "Retrieves a specific folder by its ID")
    @GetMapping("/{id}")
    fun getFolderById(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ScriptsFolderResponse> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        return ApiResponse(folder.toResponse())
    }

    @Operation(summary = "Create a new folder", description = "Creates a new script folder with automatic ordering")
    @PostMapping
    fun createFolder(
        @Parameter(description = "Folder details", required = true)
        @RequestBody request: CreateFolderRequest
    ): ApiResponse<ScriptsFolderDTO> {
        val command = CreateFolderCommand(name = request.name)
        val result = commandInvoker.invoke(createFolderHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Update folder", description = "Updates an existing folder's name and ordering")
    @PutMapping("/{id}")
    fun updateFolder(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated folder details", required = true)
        @RequestBody folderDetails: ScriptsFolderDTO
    ): ApiResponse<ScriptsFolderDTO> {
        val command = UpdateFolderCommand(
            id = id,
            name = folderDetails.name,
            ordering = folderDetails.ordering
        )
        val result = commandInvoker.invoke(updateFolderHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Delete folder", description = "Deletes a folder and automatically reorders remaining folders")
    @DeleteMapping("/{id}")
    fun deleteFolder(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        val command = DeleteFolderCommand(id = id)
        commandInvoker.invoke(deleteFolderHandler, command)
        return ApiResponse()
    }


    @Operation(summary = "Get folder content", description = "Retrieves the content of a specific folder by its ID")
    @GetMapping("/{id}/content")
    fun getFolderContent(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ScriptsFolderResponse> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        return ApiResponse(folder.toResponse())
    }


    @Operation(summary = "Reorder folders", description = "Reorders folders by moving a folder from one position to another")
    @PatchMapping("/reorder")
    fun reorderFolders(
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderRequest
    ): ApiResponse<Unit> {
        val command = ReorderFoldersCommand(
            parentFolderId = request.parentFolderId,
            parentWorkspaceId = request.parentWorkspaceId,
            fromIndex = request.fromIndex,
            toIndex = request.toIndex
        )
        commandInvoker.invoke(reorderFoldersHandler, command)
        return ApiResponse()
    }


    @PostMapping("/{folder_id}/subfolders")
    @Operation(summary = "Add subfolder to a folder", description = "Adds a subfolder to a parent folder")
    fun addSubfolder(
        @PathVariable("folder_id") parentFolderId: Int,
        @RequestBody request: CreateSubfolderRequest
    ): ApiResponse<Unit> {
        val command = AddSubfolderCommand(
            parentFolderId = parentFolderId,
            name = request.name
        )
        commandInvoker.invoke(addSubfolderHandler, command)
        return ApiResponse()
    }
}
