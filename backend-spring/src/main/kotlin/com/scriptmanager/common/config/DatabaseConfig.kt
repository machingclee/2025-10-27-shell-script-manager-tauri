package com.scriptmanager.common.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment
import javax.sql.DataSource

@Configuration
@Profile("!test")  // Don't use this config in test profile - let Testcontainers provide the datasource
class DatabaseConfig(private val env: Environment) {

    @Bean
    fun dataSource(): DataSource {
        val dbUrl = getDatabaseUrl()
        println("=== DATABASE CONFIGURATION ===")
        println("Final JDBC URL: $dbUrl")

        val config = HikariConfig()
        config.jdbcUrl = dbUrl
        config.driverClassName = "org.sqlite.JDBC"

        // SQLite-specific HikariCP settings - allow multiple connections for reads, serialize writes
        config.maximumPoolSize = 5  // Allow multiple connections for event/command auditing
        config.minimumIdle = 2
        config.connectionTimeout = 30000
        config.idleTimeout = 600000
        config.maxLifetime = 1800000
        config.poolName = "ScriptManagerPool"
        config.isAutoCommit = false  // Let Spring/Hibernate manage transactions

        // SQLite-specific connection initialization to ensure proper locking
        config.connectionInitSql = "PRAGMA busy_timeout = 30000; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;"

        println("HikariCP maximumPoolSize: ${config.maximumPoolSize}")
        println("HikariCP autoCommit: ${config.isAutoCommit}")
        println("=== END DATABASE CONFIGURATION ===")

        return HikariDataSource(config)
    }

    private fun getDatabaseUrl(): String {
        println("=== RESOLVING DATABASE URL ===")

        // Priority 1: Check if URL is provided via command line argument
        val cmdLineUrl = env.getProperty("spring.datasource.url")
        println("spring.datasource.url from application.yml: $cmdLineUrl")

        if (!cmdLineUrl.isNullOrEmpty()) {
            // Extract just the database path from the URL if it has parameters
            val basePath = if (cmdLineUrl.contains("?")) {
                cmdLineUrl.substringBefore("?")
            } else {
                cmdLineUrl
            }
            println("Base path extracted: $basePath")
            val finalUrl = appendSqliteParams(basePath)
            println("Final URL with SQLite params: $finalUrl")
            return finalUrl
        }

        // Priority 2: Check if DB_PATH environment variable is set
        val dbPath = System.getenv("DB_PATH")
        println("DB_PATH environment variable: $dbPath")
        if (!dbPath.isNullOrEmpty()) {
            return appendSqliteParams("jdbc:sqlite:$dbPath")
        }

        // Priority 3: Default to the same path as application.yml
        val defaultPath = "/Users/chingcheonglee/Repos/rust/2025-10-27-shell-script-manager-tauri/src-tauri/database.db"
        println("WARNING: Using default database path: $defaultPath")
        return appendSqliteParams("jdbc:sqlite:$defaultPath")
    }

    private fun appendSqliteParams(baseUrl: String): String {
        // Use minimal URL parameters - most settings are handled via connectionInitSql
        // This avoids potential parsing issues with SQLite JDBC driver
        val params = "?busy_timeout=30000"
        println("Appending SQLite params: $params")
        return "$baseUrl$params"
    }
}
