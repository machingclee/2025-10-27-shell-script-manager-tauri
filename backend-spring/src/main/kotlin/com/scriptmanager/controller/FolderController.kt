package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.ReorderRequest
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ScriptsFolderRepository
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*
import java.time.ZonedDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/folders")
class FolderController(
    private val folderRepository: ScriptsFolderRepository
) {
    private val hkZone = ZoneId.of("Asia/Hong_Kong")
    private val hkFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

    @GetMapping
    fun getAllFolders(): ApiResponse<List<ScriptsFolderDTO>> {
        val folders = folderRepository.findAllByOrderByOrderingAsc().map { it.toDTO() }

        return ApiResponse(folders)
    }

    @GetMapping("/{id}")
    fun getFolderById(@PathVariable id: Int): ApiResponse<ScriptsFolderDTO> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        return ApiResponse(folder.toDTO())

    }

    @PostMapping
    @Transactional
    fun createFolder(@RequestBody folder: ScriptsFolder): ApiResponse<ScriptsFolderDTO> {
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

    @Transactional
    @PutMapping("/{id}")
    fun updateFolder(
        @PathVariable id: Int,
        @RequestBody folderDetails: ScriptsFolderDTO
    ): ApiResponse<ScriptsFolderDTO> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")
        folder.name = folderDetails.name
        folder.ordering = folderDetails.ordering
        val result = folderRepository.save(folder)
        return ApiResponse(result.toDTO())
    }

    @DeleteMapping("/{id}")
    @Transactional
    fun deleteFolder(@PathVariable id: Int): ApiResponse<Unit> {
        val folder = folderRepository.findByIdOrNull(id) ?: throw Exception("Folder not found")

        // Delete the folder (cascade will handle related scripts if configured)
        folderRepository.deleteById(folder.id!!)

        // Reorder remaining folders
        val remainingFolders = folderRepository.findAllByOrderByOrderingAsc()
        remainingFolders.forEachIndexed { index, f ->
            f.ordering = index
        }
        folderRepository.saveAll(remainingFolders)

        return ApiResponse()
    }

    @Transactional
    @PostMapping("/reorder")
    fun reorderFolders(@RequestBody request: ReorderRequest): ApiResponse<Unit> {
        val folders = folderRepository.findAllByOrderByOrderingAsc()

        // Validate indices
        if (request.fromIndex < 0 || request.fromIndex >= folders.size ||
            request.toIndex < 0 || request.toIndex >= folders.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder the folders
        val movedFolder = folders[request.fromIndex]
        val reordered = folders.toMutableList()
        reordered.removeAt(request.fromIndex)
        reordered.add(request.toIndex, movedFolder)

        // Update ordering values
        reordered.forEachIndexed { index, folder ->
            folder.ordering = index
        }

        folderRepository.saveAll(reordered)
        return ApiResponse()
    }
}

