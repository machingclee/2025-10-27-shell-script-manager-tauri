package com.scriptmanager.controller

import com.scriptmanager.entity.ShellScript
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/scripts")
class ScriptController(
    private val scriptRepository: ShellScriptRepository
) {
    
    @GetMapping
    fun getAllScripts(): List<ShellScript> {
        return scriptRepository.findAllByOrderByOrderingAsc()
    }
    
    @GetMapping("/{id}")
    fun getScriptById(@PathVariable id: Int): ResponseEntity<ShellScript> {
        return scriptRepository.findById(id)
            .map { ResponseEntity.ok(it) }
            .orElse(ResponseEntity.notFound().build())
    }
    
    @PostMapping
    fun createScript(@RequestBody script: ShellScript): ShellScript {
        return scriptRepository.save(script)
    }
    
    @PutMapping("/{id}")
    fun updateScript(
        @PathVariable id: Int,
        @RequestBody scriptDetails: ShellScript
    ): ResponseEntity<ShellScript> {
        return scriptRepository.findById(id)
            .map { existingScript ->
                val updatedScript = existingScript.copy(
                    name = scriptDetails.name,
                    command = scriptDetails.command,
                    ordering = scriptDetails.ordering
                )
                ResponseEntity.ok(scriptRepository.save(updatedScript))
            }
            .orElse(ResponseEntity.notFound().build())
    }
    
    @DeleteMapping("/{id}")
    fun deleteScript(@PathVariable id: Int): ResponseEntity<Void> {
        return if (scriptRepository.existsById(id)) {
            scriptRepository.deleteById(id)
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }
}

