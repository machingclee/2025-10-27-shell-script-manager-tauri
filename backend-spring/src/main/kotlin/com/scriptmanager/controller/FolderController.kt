package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.QueryInvoker
import com.scriptmanager.domain.scriptmanager.command.folder.DeleteFolderCommand
import com.scriptmanager.domain.scriptmanager.command.folder.UpdateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.AddSubfolderCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.CreateFolderCommand
import com.scriptmanager.domain.scriptmanager.command.workspace.ReorderFoldersCommand
import com.scriptmanager.domain.scriptmanager.query.*
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/folders")
@Tag(name = "Folder Management", description = "APIs for managing script folders")
class FolderController(
    private val commandInvoker: CommandInvoker,
    private val queryInvoker: QueryInvoker
) {

    @Operation(summary = "Get all folders", description = "Retrieves all script folders ordered by their ordering value")
    @GetMapping
    fun getAllFolders(): ApiResponse<List<ScriptsFolderResponse>> {
        val query = GetAllRootFoldersQuery()
        val folders = queryInvoker.invoke(query)
        return ApiResponse(folders)
    }

    @Operation(summary = "Get folder by ID", description = "Retrieves a specific folder by its ID")
    @GetMapping("/{id}")
    fun getFolderById(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ScriptsFolderResponse> {
        val query = GetFolderByIdQuery(folderId = id)
        val folder = queryInvoker.invoke(query)
        return ApiResponse(folder)
    }

    @Operation(summary = "Create a new folder", description = "Creates a new script folder with automatic ordering")
    @PostMapping
    fun createFolder(
        @Parameter(description = "Folder details", required = true)
        @RequestBody request: CreateFolderRequest
    ): ApiResponse<ScriptsFolderDTO> {
        val command = CreateFolderCommand(name = request.name)
        val result = commandInvoker.invoke(command)
        return ApiResponse(result.toDTO())
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
        val result = commandInvoker.invoke(command)
        return ApiResponse(result)
    }

    @Operation(summary = "Delete folder", description = "Deletes a folder and automatically reorders remaining folders")
    @DeleteMapping("/{id}")
    fun deleteFolder(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        val command = DeleteFolderCommand(folderId = id)
        commandInvoker.invoke(command)
        return ApiResponse()
    }


    @Operation(summary = "Get folder content", description = "Retrieves the content of a specific folder by its ID")
    @GetMapping("/{id}/content")
    fun getFolderContent(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<ScriptsFolderResponse> {
        val query = GetFolderContentByIdQuery(folderId = id)
        val folder = queryInvoker.invoke(query)
        return ApiResponse(folder)
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
        commandInvoker.invoke(command)
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
        commandInvoker.invoke(command)
        return ApiResponse()
    }
}
