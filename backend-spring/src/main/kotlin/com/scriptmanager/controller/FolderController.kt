package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.WorkspaceRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/folders")
@Tag(name = "Folder Management", description = "APIs for managing script folders")
class FolderController(
    private val folderRepository: ScriptsFolderRepository,
    private val workspaceRepository: WorkspaceRepository
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
    @Transactional
    fun createFolder(
        @Parameter(description = "Folder details", required = true)
        @RequestBody folder: ScriptsFolder
    ): ApiResponse<ScriptsFolderDTO> {
        // Get count of folders to determine ordering
        val count = folderRepository.findAll().size

        // Create folder with ordering (timestamps will be set by SQLite defaults)
        val newFolder = ScriptsFolder(
            name = folder.name,
            ordering = count
        )

        val result = folderRepository.save(newFolder)
        return ApiResponse(result.toDTO())
    }

    @Operation(summary = "Update folder", description = "Updates an existing folder's name and ordering")
    @Transactional
    @PutMapping("/{id}")
    fun updateFolder(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int,
        @Parameter(description = "Updated folder details", required = true)
        @RequestBody folderDetails: ScriptsFolderDTO
    ): ApiResponse<ScriptsFolderDTO> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        folder.name = folderDetails.name
        folder.ordering = folderDetails.ordering
        val result = folderRepository.save(folder)
        return ApiResponse(result.toDTO())
    }

    @Operation(summary = "Delete folder", description = "Deletes a folder and automatically reorders remaining folders")
    @DeleteMapping("/{id}")
    @Transactional
    fun deleteFolder(
        @Parameter(description = "Folder ID", required = true)
        @PathVariable id: Int
    ): ApiResponse<Unit> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        val parentFolder = folder.parentFolder
        if (parentFolder == null) {
            folderRepository.deleteById(folder.id!!)

            // Reorder remaining folders
            val remainingFolders = folderRepository.findAllRootLevelFolder()
            remainingFolders.forEachIndexed { index, f ->
                f.ordering = index
            }
            folderRepository.saveAll(remainingFolders)
        } else {
            parentFolder.removeFolder(folder)
        }

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
    @Transactional
    @PatchMapping("/reorder")
    fun reorderFolders(
        @Parameter(description = "Reorder request with from and to indices", required = true)
        @RequestBody request: ReorderRequest
    ): ApiResponse<Unit> {
        val parentFolderId = request.parentFolderId
        val parentWorkspaceId = request.parentWorkspaceId

        if (parentFolderId == null && (parentWorkspaceId == null || parentWorkspaceId == 0)) {
            // Reorder root-level folders
            val folders = folderRepository.findAllRootLevelFolder()

            // Validate indices
            if (request.fromIndex < 0 || request.fromIndex >= folders.size ||
                request.toIndex < 0 || request.toIndex >= folders.size
            ) {
                throw Exception("Invalid indices")
            }

            val movedFolder = folders[request.fromIndex]
            val reordered = folders.toMutableList()
            reordered.removeAt(request.fromIndex)
            reordered.add(request.toIndex, movedFolder)

            // Update ordering values
            reordered.forEachIndexed { index, folder ->
                folder.ordering = index
            }
            folderRepository.saveAll(reordered)
        } else if (parentWorkspaceId != null && parentWorkspaceId != 0) {
            val workspace = workspaceRepository.findByIdOrNull(parentWorkspaceId)
                ?: throw Exception("Workspace not found")
            val folders = workspace.folders.sortedBy { it.ordering }.toMutableList()

            // Validate indices for subfolders
            if (request.fromIndex < 0 || request.fromIndex >= folders.size ||
                request.toIndex < 0 || request.toIndex >= folders.size
            ) {
                throw Exception("Invalid indices for subfolders")
            }

            reorderFolders(request, folders)
            folderRepository.saveAll(folders)
        } else {
            // we reorder the subfolders
            // Reorder subfolders within the specified parent folder
            val parentFolder = folderRepository.findByIdOrNull(parentFolderId)
                ?: throw Exception("Parent folder not found")
            val subfolders = parentFolder.subfolders.sortedBy { it.ordering }.toMutableList()

            // Validate indices for subfolders
            reorderFolders(request, subfolders)
            folderRepository.saveAll(subfolders)
        }

        return ApiResponse()
    }


    @PostMapping("/{folder_id}/subfolders")
    @Transactional
    @Operation(summary = "Add subfolder to a folder", description = "Adds a subfolder to a parent folder")
    fun addSubfolder(
        @PathVariable("folder_id") parentFolderId: Int,
        @RequestBody request: CreateSubfolderRequest
    ): ApiResponse<Unit> {
        val parentFolder = folderRepository.findByIdOrNull(parentFolderId) ?: throw Exception("Parent folder not found")
        val newSubfolder = ScriptsFolder(
            name = request.name,
            ordering = 0
        )
        parentFolder.addFolder(newSubfolder)
        return ApiResponse()
    }
    

    private fun reorderFolders(request: ReorderRequest, subfolders: MutableList<ScriptsFolder>) {
        if (request.fromIndex < 0 || request.fromIndex >= subfolders.size ||
            request.toIndex < 0 || request.toIndex >= subfolders.size
        ) {
            throw Exception("Invalid indices for subfolders")
        }

        val movedSubfolder = subfolders[request.fromIndex]
        subfolders.removeAt(request.fromIndex)
        subfolders.add(request.toIndex, movedSubfolder)
        subfolders.forEachIndexed { idx, folder ->
            folder.ordering = idx
        }
    }
}
