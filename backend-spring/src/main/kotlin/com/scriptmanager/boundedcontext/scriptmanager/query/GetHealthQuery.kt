package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.domainutils.Query

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

