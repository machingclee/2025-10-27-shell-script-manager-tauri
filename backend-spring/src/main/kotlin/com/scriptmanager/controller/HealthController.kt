package com.scriptmanager.controller

import com.scriptmanager.domain.infrastructure.QueryInvoker
import com.scriptmanager.domain.scriptmanager.query.GetHealthQuery
import com.scriptmanager.domain.scriptmanager.query.HealthResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@Tag(name = "Health Check", description = "APIs for health monitoring")
class HealthController(
    private val queryInvoker: QueryInvoker
) {

    @Operation(summary = "Health check", description = "Returns the health status of the application")
    @GetMapping("/health")
    fun health(): HealthResponse {
        val query = GetHealthQuery()
        return queryInvoker.invoke(query)
    }
}
