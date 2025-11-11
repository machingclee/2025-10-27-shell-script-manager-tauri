package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.*
import com.scriptmanager.domain.scriptmanager.commandhandler.*
import com.scriptmanager.repository.WorkspaceRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/workspace")
@Tag(name = "Workspace Management", description = "APIs for managing workspaces")
class WorkspaceController(
    private val workspaceRepository: WorkspaceRepository,
    private val commandInvoker: CommandInvoker,
    private val createWorkspaceHandler: CreateWorkspaceHandler,
    private val updateWorkspaceHandler: UpdateWorkspaceHandler,
    private val deleteWorkspaceHandler: DeleteWorkspaceHandler,
    private val addFolderToWorkspaceHandler: AddFolderToWorkspaceHandler,
    private val removeFolderFromWorkspaceHandler: RemoveFolderFromWorkspaceHandler,
    private val reorderWorkspacesHandler: ReorderWorkspacesHandler,
    private val reorderWorkspaceFoldersHandler: ReorderWorkspaceFoldersHandler,
    private val createFolderInWorkspaceHandler: CreateFolderInWorkspaceHandler
) {

    @Operation(summary = "Get all workspaces", description = "Retrieves all workspaces ordered by their ordering value")
    @GetMapping
    fun getAllWorkspaces(): ApiResponse<List<WorkspaceResponse>> {
        val workspaces = workspaceRepository.findAll()
            .sortedBy { it.ordering }
            .map { it.toResponse() }
        return ApiResponse(workspaces)
    }

    @Operation(summary = "Get workspace by ID", description = "Retrieves a specific workspace by its ID with all folders")
    @GetMapping("/{id}")
    fun getWorkspaceById(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<WorkspaceWithFoldersDTO> {
        val workspace = workspaceRepository.findByIdOrNull(id)
            ?: throw Exception("Workspace not found")
        return ApiResponse(workspace.toWorkspaceWithFoldersDTO())
    }

    @Operation(summary = "Create a new workspace", description = "Creates a new workspace with automatic ordering")
    @PostMapping
    fun createWorkspace(
        @Parameter(description = "Workspace details", required = true)
        @RequestBody request: CreateWorkspaceRequest
    ): ApiResponse<WorkspaceDTO> {
        val command = CreateWorkspaceCommand(name = request.name)
        val result = commandInvoker.invoke(createWorkspaceHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Update workspace", description = "Updates an existing workspace's name and ordering")
    @PutMapping("/{id}")
    fun updateWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated workspace details", required = true)
        @RequestBody workspaceDetails: WorkspaceDTO
    ): ApiResponse<WorkspaceDTO> {
        val command = UpdateWorkspaceCommand(
            id = id,
            name = workspaceDetails.name,
            ordering = workspaceDetails.ordering
        )
        val result = commandInvoker.invoke(updateWorkspaceHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Delete workspace", description = "Deletes a workspace and automatically reorders remaining workspaces")
    @DeleteMapping("/{id}")
    fun deleteWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        val command = DeleteWorkspaceCommand(id = id)
        commandInvoker.invoke(deleteWorkspaceHandler, command)
        return ApiResponse()
    }

    @Operation(summary = "Add folder to workspace", description = "Adds an existing folder to a workspace")
    @PutMapping("/{workspaceId}/folders/{folderId}/move")
    fun addFolderToWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable workspaceId: Int,
        @PathVariable folderId: Int,
    ): ApiResponse<WorkspaceWithFoldersDTO> {
        val command = AddFolderToWorkspaceCommand(
            workspaceId = workspaceId,
            folderId = folderId
        )
        val result = commandInvoker.invoke(addFolderToWorkspaceHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Set folder to have null workspace", description = "Removes a folder from any existing workspace")
    @PutMapping("/folders/{folderId}/reset")
    fun removeFolderFromWorkspace(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable folderId: Int
    ): ApiResponse<WorkspaceWithFoldersDTO> {
        val command = RemoveFolderFromWorkspaceCommand(folderId = folderId)
        val result = commandInvoker.invoke(removeFolderFromWorkspaceHandler, command)
        return ApiResponse(result)
    }

    @Operation(summary = "Reorder workspaces", description = "Reorders workspaces by moving a workspace from one position to another")
    @PatchMapping("/reorder")
    fun reorderWorkspaces(
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderWorkspacesRequest
    ): ApiResponse<Unit> {
        val command = ReorderWorkspacesCommand(
            fromIndex = request.fromIndex,
            toIndex = request.toIndex
        )
        commandInvoker.invoke(reorderWorkspacesHandler, command)
        return ApiResponse()
    }

    @Operation(summary = "Reorder folders within workspace", description = "Reorders folders within a workspace")
    @PatchMapping("/{id}/folders/reorder")
    fun reorderWorkspaceFolders(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderWorkspaceFoldersRequest
    ): ApiResponse<Unit> {
        val command = ReorderWorkspaceFoldersCommand(
            workspaceId = id,
            fromIndex = request.fromIndex,
            toIndex = request.toIndex
        )
        commandInvoker.invoke(reorderWorkspaceFoldersHandler, command)
        return ApiResponse()
    }

    // create workspace folder
    @Operation(summary = "Create a new folder in workspace", description = "Creates a new folder within a specified workspace")
    @PostMapping("/{workspaceId}/folders")
    fun createFolderInWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable workspaceId: Int,
        @Parameter(description = "Folder details", required = true)
        @RequestBody request: CreateSubfolderRequest
    ): ApiResponse<ScriptsFolderResponse> {
        val command = CreateFolderInWorkspaceCommand(
            workspaceId = workspaceId,
            name = request.name
        )
        val result = commandInvoker.invoke(createFolderInWorkspaceHandler, command)
        return ApiResponse(result)
    }
}