package com.scriptmanager.controller

import com.scriptmanager.common.dto.ApiResponse
import com.scriptmanager.common.dto.CreateScriptRequest
import com.scriptmanager.common.dto.ReorderScriptsRequest
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ScriptsFolderRepository
import com.scriptmanager.repository.ShellScriptRepository
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
    private val shellScriptRepository: ShellScriptRepository
) {
    private val hkZone = ZoneId.of("Asia/Hong_Kong")
    private val hkFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

    @GetMapping
    fun getAllScripts(): ApiResponse<List<ShellScriptDTO>> {
        val list = scriptRepository.findAllByOrderByOrderingAsc().map { it.toDTO() }
        return ApiResponse(list)
    }

    @GetMapping("/folder/{folderId}")
    fun getScriptsByFolder(@PathVariable folderId: Int): ApiResponse<List<ShellScriptDTO>> {
        val scripts = scriptRepository.findByFolderId(folderId).map { it.toDTO() }
        return ApiResponse(scripts)
    }

    @GetMapping("/{id}")
    fun getScriptById(@PathVariable id: Int): ApiResponse<ShellScript> {
        val script = scriptRepository.findByIdOrNull(id) ?: throw Exception("Script not found")
        return ApiResponse(script)
    }

    @PostMapping
    @Transactional
    fun createScript(@RequestBody request: CreateScriptRequest): ApiResponse<ShellScriptDTO> {
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
        script.scriptsFolder = folder

        val savedScript = scriptRepository.save(script)
        return ApiResponse(savedScript.toDTO())
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
            ordering = scriptDetails.ordering
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

        scriptRepository.saveAll(scripts)
        return ApiResponse()
    }
}
