package com.scriptmanager.common.utils

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.LoggerContext
import org.slf4j.LoggerFactory

object AliceLoggingUtil {
    fun <T> hibernateSQL(block: () -> T): T {
        val loggerContext = LoggerFactory.getILoggerFactory() as LoggerContext
        val hibernateLogger = loggerContext.getLogger("org.hibernate.SQL")
        val originalLevel = hibernateLogger.level

        try {
            hibernateLogger.level = Level.DEBUG
            return block()
        } finally {
            hibernateLogger.level = originalLevel
        }
    }

    fun <T> duration(tag: String, block: () -> T): T {
        val startTime = System.currentTimeMillis()
        val result = block()
        val duration = System.currentTimeMillis() - startTime
        println("[METRIC: $tag] ${duration}ms")
        return result
    }
}