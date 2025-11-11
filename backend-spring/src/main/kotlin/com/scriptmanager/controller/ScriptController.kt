package com.scriptmanager.controller

import com.scriptmanager.common.dto.*
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.web.bind.annotation.*
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/scripts")
class ScriptController(
    private val scriptRepository: ShellScriptRepository,
    private val folderRepository: ScriptsFolderRepository,
    private val shellScriptRepository: ShellScriptRepository,
    private val entityManager: EntityManager
) {
    private val hkZone = ZoneId.of("Asia/Hong_Kong")
    private val hkFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

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
    @Transactional
    fun createScript(@RequestBody request: CreateScriptRequest): ApiResponse<ShellScriptResponse> {
        // Verify folder exists
        val folder = folderRepository.findByIdOrNull(request.folderId)
            ?: throw Exception("Folder not found")

        // Get count of scripts in folder to determine ordering
        val count = scriptRepository.findByFolderId(request.folderId).size


        // Create script with ordering
        val script = ShellScript(
            name = request.name,
            command = request.content,
            ordering = count,
        )
        val savedScript = shellScriptRepository.save(script)
        folder.addScript(savedScript)
        shellScriptRepository
        return ApiResponse(savedScript.toResponse())
    }

    @Transactional
    @PutMapping("/{id}")
    fun updateScript(
        @PathVariable id: Int,
        @RequestBody scriptDetails: ShellScriptDTO
    ): ShellScriptDTO {
        val script = scriptRepository.findByIdOrNull(id) ?: throw Exception("Script not found")
        script.apply {
            name = scriptDetails.name
            command = scriptDetails.command
            showShell = scriptDetails.showShell
        }
        return script.toDTO()
    }

    @DeleteMapping("/{id}")
    @Transactional
    fun deleteScript(
        @PathVariable id: Int,
        @RequestParam folderId: Int
    ): ApiResponse<Unit> {
        val script = scriptRepository.findByIdOrNull(id) ?: throw Exception("Script not found")

        // Delete the script (cascade will handle relationship)
        scriptRepository.deleteById(id)

        // Reorder remaining scripts in the folder
        val remainingScripts = scriptRepository.findByFolderId(folderId)
        remainingScripts.forEachIndexed { index, s ->
            s.ordering = index
        }
        scriptRepository.saveAll(remainingScripts)

        return ApiResponse()
    }

    @PostMapping("/reorder")
    @Transactional
    fun reorderScripts(@RequestBody request: ReorderScriptsRequest): ApiResponse<Unit> {
        val scripts = scriptRepository.findByFolderId(request.folderId).toMutableList()

        // Validate indices
        if (request.fromIndex < 0 || request.fromIndex >= scripts.size ||
            request.toIndex < 0 || request.toIndex >= scripts.size
        ) {
            throw Exception("Invalid indices")
        }

        // Reorder in memory
        val movedScript = scripts.removeAt(request.fromIndex)
        scripts.add(request.toIndex, movedScript)

        // Update ordering values in database
        scripts.forEachIndexed { index, script ->
            script.ordering = index
        }
        return ApiResponse()
    }

    @PutMapping("/{scriptId}/folder/{folderId}/move")
    @Transactional
    fun moveScriptToFolder(
        @PathVariable scriptId: Int,
        @PathVariable folderId: Int
    ): ApiResponse<Unit> {
        val script = shellScriptRepository.findByIdOrNull(scriptId) ?: throw Exception("Script not found")
        val targetFolder = folderRepository.findByIdOrNull(folderId) ?: throw Exception("Folder not found")
        script.parentFolder = targetFolder
        script.ordering = -1
        entityManager.flush()
        entityManager.refresh(targetFolder)
        targetFolder.resetScriptOrders()
        folderRepository.save(targetFolder)
        return ApiResponse()
    }
}
