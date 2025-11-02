package com.scriptmanager.common.config

import org.springframework.boot.jdbc.DataSourceBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import javax.sql.DataSource

@Configuration
class DatabaseConfig(private val env: Environment) {

    @Bean
    fun dataSource(): DataSource {
        val dbUrl = getDatabaseUrl()
        println("Configuring database with URL: $dbUrl")

        return DataSourceBuilder.create()
            .driverClassName("org.sqlite.JDBC")
            .url(dbUrl)
            .build()
    }

    private fun getDatabaseUrl(): String {
        // Priority 1: Check if URL is provided via command line argument
        val cmdLineUrl = env.getProperty("spring.datasource.url")
        if (cmdLineUrl != null && cmdLineUrl.isNotEmpty()) {
            return cmdLineUrl
        }

        // Priority 2: Check if DB_PATH environment variable is set
        val dbPath = System.getenv("DB_PATH")
        if (dbPath != null && dbPath.isNotEmpty()) {
            return "jdbc:sqlite:$dbPath"
        }

        // Priority 3: Default to development path
        val defaultPath = "../src-tauri/database.db"
        println("WARNING: Using default database path: $defaultPath")
        return "jdbc:sqlite:$defaultPath"
    }
}

