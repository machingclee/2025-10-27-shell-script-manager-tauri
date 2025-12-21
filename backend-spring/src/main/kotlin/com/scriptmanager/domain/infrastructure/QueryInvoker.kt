package com.scriptmanager.domain.infrastructure

import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.lang.reflect.ParameterizedType
import java.util.UUID

/**
 * QueryInvoker is responsible for routing queries to their appropriate handlers.
 * Unlike CommandInvoker, queries are read-only operations and:
 * - Do not produce domain events
 * - Use read-only transactions (@Transactional(readOnly = true))
 * - Are typically lighter weight
 * - Can be cached or optimized for read performance
 */
interface QueryInvoker {
    /**
     * Invokes the appropriate query handler for the given query.
     * @param query The query to execute
     * @return The query result
     */
    fun <R> invoke(query: Query<R>): R
}

@Component
class DefaultQueryInvoker(
    private val queryHandlers: List<QueryHandler<*, *>>
) : QueryInvoker {

    private val logger = LoggerFactory.getLogger(DefaultQueryInvoker::class.java)

    /**
     * Map of query class to its handler for fast lookup
     */
    private val handlerMap: Map<Class<*>, QueryHandler<*, *>> = buildHandlerMap()

    private fun buildHandlerMap(): Map<Class<*>, QueryHandler<*, *>> {
        val map = mutableMapOf<Class<*>, QueryHandler<*, *>>()

        queryHandlers.forEach { handler ->
            val queryClass = extractQueryClass(handler)
            if (queryClass != null) {
                if (map.containsKey(queryClass)) {
                    throw IllegalStateException(
                        "Multiple handlers found for query: ${queryClass.simpleName}"
                    )
                }
                map[queryClass] = handler
                logger.info("Registered query handler: ${handler::class.simpleName} for ${queryClass.simpleName}")
            } else {
                logger.warn("Could not determine query type for handler: ${handler::class.simpleName}")
            }
        }

        return map
    }

    private fun extractQueryClass(handler: QueryHandler<*, *>): Class<*>? {
        // Look through all generic interfaces
        val genericInterfaces = handler::class.java.genericInterfaces

        for (genericInterface in genericInterfaces) {
            if (genericInterface is ParameterizedType &&
                genericInterface.rawType == QueryHandler::class.java
            ) {
                val typeArguments = genericInterface.actualTypeArguments
                if (typeArguments.isNotEmpty()) {
                    return typeArguments[0] as? Class<*>
                }
            }
        }

        return null
    }

    @Transactional(readOnly = true)
    @Suppress("UNCHECKED_CAST")
    override fun <R> invoke(query: Query<R>): R {
        // Set up MDC for request tracing (optional for queries, but useful for debugging)
        val existingRequestId = MDC.get("requestId")
        val requestId = existingRequestId ?: UUID.randomUUID().toString()

        if (existingRequestId == null) {
            MDC.put("requestId", requestId)
        }

        try {
            val handler = handlerMap[query::class.java] as? QueryHandler<Query<R>, R>
                ?: throw IllegalArgumentException(
                    "No handler found for query: ${query::class.simpleName}. " +
                            "Available handlers: ${handlerMap.keys.map { it.simpleName }}"
                )

            logger.debug("Executing query: ${query::class.simpleName} with requestId: $requestId")

            val result = handler.handle(query)

            logger.debug("Query completed: ${query::class.simpleName}")

            return result
        } catch (e: Exception) {
            logger.error("Query failed: ${query::class.simpleName}, error: ${e.message}", e)
            throw e
        } finally {
            // Only clear MDC if we created it
            if (existingRequestId == null) {
                MDC.remove("requestId")
            }
        }
    }
}

