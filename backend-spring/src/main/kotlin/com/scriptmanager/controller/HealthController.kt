package com.scriptmanager.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    data class HealthResponse(
        val status: String = "UP",
        val timestamp: Long = System.currentTimeMillis()
    )

    @GetMapping("/health")
    fun health(): HealthResponse {
        return HealthResponse()
    }
}
