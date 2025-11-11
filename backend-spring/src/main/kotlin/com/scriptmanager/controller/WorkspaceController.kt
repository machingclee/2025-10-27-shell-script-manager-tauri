package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.Workspace
import com.scriptmanager.common.entity.WorkspaceDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/workspace")
@Tag(name = "Workspace Management", description = "APIs for managing workspaces")
class WorkspaceController(
    private val workspaceRepository: WorkspaceRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val entityManager: EntityManager
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
    @Transactional
    fun createWorkspace(
        @Parameter(description = "Workspace details", required = true)
        @RequestBody request: CreateWorkspaceRequest
    ): ApiResponse<WorkspaceDTO> {
        // Get count of workspaces to determine ordering
        val count = workspaceRepository.findAll().size

        // Create workspace with ordering
        val newWorkspace = Workspace(
            name = request.name,
            ordering = count
        )

        val result = workspaceRepository.save(newWorkspace)
        return ApiResponse(result.toDTO())
    }

    @Operation(summary = "Update workspace", description = "Updates an existing workspace's name and ordering")
    @Transactional
    @PutMapping("/{id}")
    fun updateWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated workspace details", required = true)
        @RequestBody workspaceDetails: WorkspaceDTO
    ): ApiResponse<WorkspaceDTO> {
        val workspace = workspaceRepository.findByIdOrNull(id)
            ?: throw Exception("Workspace not found")
        workspace.name = workspaceDetails.name
        workspace.ordering = workspaceDetails.ordering
        val result = workspaceRepository.save(workspace)
        return ApiResponse(result.toDTO())
    }

    @Operation(summary = "Delete workspace", description = "Deletes a workspace and automatically reorders remaining workspaces")
    @DeleteMapping("/{id}")
    @Transactional
    fun deleteWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        val workspace = workspaceRepository.findByIdOrNull(id)
            ?: throw Exception("Workspace not found")

        workspaceRepository.deleteById(workspace.id!!)

        // Reorder remaining workspaces
        val remainingWorkspaces = workspaceRepository.findAll().sortedBy { it.ordering }
        remainingWorkspaces.forEachIndexed { index, w ->
            w.ordering = index
        }
        workspaceRepository.saveAll(remainingWorkspaces)

        return ApiResponse()
    }

    @Operation(summary = "Add folder to workspace", description = "Adds an existing folder to a workspace")
    @PutMapping("/{workspaceId}/folders/{folderId}/move")
    @Transactional
    fun addFolderToWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable workspaceId: Int,
        @PathVariable folderId: Int,
    ): ApiResponse<WorkspaceWithFoldersDTO> {
        val folder = folderRepository.findByIdOrNull(folderId)
            ?: throw Exception("Folder not found")
        val newWorkspace = workspaceRepository.findByIdOrNull(workspaceId)
            ?: throw Exception("Workspace not found")
        val originalParentWorkspace = workspaceRepository.findByIdOrNull(folder.parentWorkspace?.id ?: -1)

        folder.parentWorkspace = newWorkspace
        folder.ordering = -1
        workspaceRepository.save(newWorkspace)
        entityManager.flush()

        entityManager.refresh(newWorkspace)
        if (originalParentWorkspace != null) {
            entityManager.refresh(originalParentWorkspace)
        }

        newWorkspace.resetFolderOrders()
        originalParentWorkspace?.resetFolderOrders()

        return ApiResponse(newWorkspace.toWorkspaceWithFoldersDTO())
    }

    @Operation(summary = "Set folder to have null workspace", description = "Removes a folder from any existing workspace")
    @PutMapping("/folders/{folderId}/reset")
    @Transactional
    fun removeFolderFromWorkspace(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable folderId: Int
    ): ApiResponse<WorkspaceWithFoldersDTO> {
        val orphanedRootLevelFolders = folderRepository.findAllRootLevelFolder()

        val folder = folderRepository.findByIdOrNull(folderId)
            ?: throw Exception("Folder not found")

        val workspace = workspaceRepository.findByIdOrNull(folder.parentWorkspace?.id ?: -1)
            ?: throw Exception("Workspace not found")

        folder.parentWorkspace = null
        val reorderedFolders = orphanedRootLevelFolders.toMutableList()
        reorderedFolders.add(0, folder)
        reorderedFolders.forEachIndexed { index, f ->
            f.ordering = index
        }
        folderRepository.saveAll(reorderedFolders)
        entityManager.refresh(workspace)
        return ApiResponse(workspace.toWorkspaceWithFoldersDTO())
    }

    @Operation(summary = "Reorder workspaces", description = "Reorders workspaces by moving a workspace from one position to another")
    @Transactional
    @PatchMapping("/reorder")
    fun reorderWorkspaces(
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderWorkspacesRequest
    ): ApiResponse<Unit> {
        val workspaces = workspaceRepository.findAll().sortedBy { it.ordering }

        // Validate indices
        if (request.fromIndex < 0 || request.fromIndex >= workspaces.size ||
            request.toIndex < 0 || request.toIndex >= workspaces.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder the workspaces
        val movedWorkspace = workspaces[request.fromIndex]
        val reordered = workspaces.toMutableList()
        reordered.removeAt(request.fromIndex)
        reordered.add(request.toIndex, movedWorkspace)

        // Update ordering values
        reordered.forEachIndexed { index, workspace ->
            workspace.ordering = index
        }
        workspaceRepository.saveAll(reordered)

        return ApiResponse()
    }

    @Operation(summary = "Reorder folders within workspace", description = "Reorders folders within a workspace")
    @Transactional
    @PatchMapping("/{id}/folders/reorder")
    fun reorderWorkspaceFolders(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderWorkspaceFoldersRequest
    ): ApiResponse<Unit> {
        val workspace = workspaceRepository.findByIdOrNull(id)
            ?: throw Exception("Workspace not found")

        val folders = workspace.folders.sortedBy { it.ordering }.toMutableList()

        // Validate indices
        if (request.fromIndex < 0 || request.fromIndex >= folders.size ||
            request.toIndex < 0 || request.toIndex >= folders.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder the folders
        val movedFolder = folders[request.fromIndex]
        folders.removeAt(request.fromIndex)
        folders.add(request.toIndex, movedFolder)

        // Update ordering values
        folders.forEachIndexed { index, folder ->
            folder.ordering = index
        }
        folderRepository.saveAll(folders)

        return ApiResponse()
    }

    // create workspace folder
    @Operation(summary = "Create a new folder in workspace", description = "Creates a new folder within a specified workspace")
    @PostMapping("/{workspaceId}/folders")
    @Transactional
    fun createFolderInWorkspace(
        @Parameter(description = "Workspace ID", required = true)
        @PathVariable workspaceId: Int,
        @Parameter(description = "Folder details", required = true)
        @RequestBody request: CreateSubfolderRequest
    ): ApiResponse<ScriptsFolderResponse> {
        val workspace = workspaceRepository.findByIdOrNull(workspaceId)
            ?: throw Exception("Workspace not found")

        val newFolder = folderRepository.save(
            ScriptsFolder(
                name = request.name,
                ordering = -1
            )
        )
        workspace.folders.add(newFolder)
        workspace.resetFolderOrders()
        workspaceRepository.save(workspace)
        entityManager.flush()
        entityManager.refresh(newFolder)
        return ApiResponse(newFolder.toResponse())
    }
}