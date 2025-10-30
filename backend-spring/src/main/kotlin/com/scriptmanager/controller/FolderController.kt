package com.scriptmanager.controller

import com.scriptmanager.entity.ScriptsFolder
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/folders")
class FolderController(
    private val folderRepository: ScriptsFolderRepository
) {
    
    @GetMapping
    fun getAllFolders(): List<ScriptsFolder> {
        return folderRepository.findAllByOrderByOrderingAsc()
    }
    
    @GetMapping("/{id}")
    fun getFolderById(@PathVariable id: Int): ResponseEntity<ScriptsFolder> {
        return folderRepository.findById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }
    
    @PostMapping
    fun createFolder(@RequestBody folder: ScriptsFolder): ScriptsFolder {
        return folderRepository.save(folder)
    }
    
    @PutMapping("/{id}")
    fun updateFolder(
        @PathVariable id: Int,
        @RequestBody folderDetails: ScriptsFolder
    ): ResponseEntity<ScriptsFolder> {
        return folderRepository.findById(id)
            .map { existingFolder ->
                val updatedFolder = existingFolder.copy(
                    name = folderDetails.name,
                    ordering = folderDetails.ordering
                )
                ResponseEntity.ok(folderRepository.save(updatedFolder))
            }
            .orElse(ResponseEntity.notFound().build())
    }
    
    @DeleteMapping("/{id}")
    fun deleteFolder(@PathVariable id: Int): ResponseEntity<Void> {
        return if (folderRepository.existsById(id)) {
            folderRepository.deleteById(id)
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }
}

