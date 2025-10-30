package com.scriptmanager.controller

import com.scriptmanager.entity.ApplicationState
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/app-state")
class ApplicationStateController(
    private val appStateRepository: ApplicationStateRepository
) {
    
    @GetMapping
    fun getApplicationState(): ResponseEntity<ApplicationState> {
        val state = appStateRepository.findAll().firstOrNull()
        return if (state != null) {
            ResponseEntity.ok(state)
        } else {
            ResponseEntity.notFound().build()
        }
    }
    
    @PutMapping
    fun updateApplicationState(@RequestBody state: ApplicationState): ApplicationState {
        return appStateRepository.save(state)
    }
}

