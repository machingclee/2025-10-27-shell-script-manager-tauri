package com.scriptmanager.common.domainutils

/**
 * Handler interface for processing queries.
 * Unlike CommandHandlers, QueryHandlers do not receive an EventQueue
 * since queries should not produce domain events or modify state.
 */
interface QueryHandler<Q : Query<R>, R> {
    /**
     * Handles the query and returns the result.
     * @param query The query to handle
     * @return The query result
     */
    fun handle(query: Q): R
}

