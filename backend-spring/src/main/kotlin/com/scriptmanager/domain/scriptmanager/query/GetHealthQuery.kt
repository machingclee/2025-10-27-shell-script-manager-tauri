package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.domain.infrastructure.Query

/**
 * Health check response
 */
data class HealthResponse(
    val status: String = "UP",
    val timestamp: Long = System.currentTimeMillis(),
    val databaseUrl: String
)

/**
 * Query to get health status
 */
data class GetHealthQuery(
    val dummy: Boolean = true
) : Query<HealthResponse>

