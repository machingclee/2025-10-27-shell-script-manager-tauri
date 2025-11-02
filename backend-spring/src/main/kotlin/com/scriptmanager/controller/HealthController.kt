package com.scriptmanager.controller

import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController(
    @Value("\${spring.datasource.url}")
    private val databaseUrl: String
) {

    data class HealthResponse(
        val status: String = "UP",
        val timestamp: Long = System.currentTimeMillis(),
        val databaseUrl: String
    )

    @GetMapping("/health")
    fun health(): HealthResponse {
        return HealthResponse(databaseUrl = databaseUrl)
    }
}
