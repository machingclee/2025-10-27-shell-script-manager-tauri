package com.scriptmanager.common.domainutils

/**
 * Marker interface for domain policies.
 * Policies listen to domain events and may invoke commands in response.
 */
interface Policy {
    /**
     * Declare the event-to-command mappings for this policy.
     * This is used to build the flow diagram.
     */
    fun declareflows(): List<PolicyFlow>
}

data class PolicyFlow(
    val fromEvent: Class<*>,
    val toCommand: Class<*>
)

