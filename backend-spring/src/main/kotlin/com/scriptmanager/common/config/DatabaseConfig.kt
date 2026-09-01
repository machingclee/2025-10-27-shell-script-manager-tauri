package com.scriptmanager.common.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.nio.file.Files
import java.nio.file.Path
import javax.sql.DataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment

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
        config.driverClassName = "org.h2.Driver"

        // H2 is MVCC - the pool can be shared by all reads/writes without the
        // single-writer serialization SQLite needed.
        config.maximumPoolSize = 5
        config.minimumIdle = 2
        config.connectionTimeout = 30000
        config.idleTimeout = 600000
        config.maxLifetime = 1800000
        config.poolName = "ScriptManagerPool"
        config.isAutoCommit = false  // Let Spring/Hibernate manage transactions

        println("HikariCP maximumPoolSize: ${config.maximumPoolSize}")
        println("HikariCP autoCommit: ${config.isAutoCommit}")
        println("=== END DATABASE CONFIGURATION ===")

        return HikariDataSource(config)
    }

    private fun getDatabaseUrl(): String {
        println("=== RESOLVING DATABASE URL ===")

        // Priority 1: URL provided via application.yml / command line argument
        // (production: Tauri passes an absolute URL via --spring.datasource.url=...).
        val cmdLineUrl = env.getProperty("spring.datasource.url")
        println("spring.datasource.url from application.yml: $cmdLineUrl")

        if (!cmdLineUrl.isNullOrEmpty()) {
            return normalizeH2Url(cmdLineUrl)
        }

        // Priority 2: Check if DB_PATH environment variable is set
        val dbPath = System.getenv("DB_PATH")
        println("DB_PATH environment variable: $dbPath")
        if (!dbPath.isNullOrEmpty()) {
            return buildH2Url(dbPath)
        }

        // Priority 3: Development default - resolved relative to the repository root
        println("WARNING: No DB_PATH configured, using repository-local dev default")
        return buildH2Url("src-tauri/database")
    }

    /**
     * Builds an H2 file URL, resolving a relative file base against the
     * repository root so the app works from any working directory (IntelliJ,
     * `./gradlew bootRun`, CI, ...).
     *
     * `USER=sa` with an empty password is explicit on purpose: H2 2.2.224
     * generates a random `sa` password for a freshly created database when no
     * credentials are supplied, which would lock out later connections.
     */
    private fun buildH2Url(dbBase: String): String =
        "jdbc:h2:file:${resolveDatabaseBase(dbBase)};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;USER=sa;PASSWORD="

    /**
     * Normalizes a URL that may contain a relative file path
     * (e.g. `jdbc:h2:file:src-tauri/database;MODE=...`).
     */
    private fun normalizeH2Url(url: String): String {
        val prefix = "jdbc:h2:file:"
        if (!url.startsWith(prefix)) {
            return url
        }
        val rest = url.removePrefix(prefix)
        val semicolon = rest.indexOf(';')
        val filePart = if (semicolon >= 0) rest.substring(0, semicolon) else rest
        val params = if (semicolon >= 0) rest.substring(semicolon) else ""
        return prefix + resolveDatabaseBase(filePart) + params
    }

    private fun resolveDatabaseBase(dbBase: String): String {
        val path = Path.of(dbBase)
        if (path.isAbsolute) {
            return dbBase
        }
        return findRepositoryRoot().resolve(path).normalize().toString()
    }

    /**
     * Walks up from the working directory to find the repository root
     * (a directory that contains both `backend-spring` and `src-tauri`).
     */
    private fun findRepositoryRoot(): Path {
        var dir: Path? = Path.of("").toAbsolutePath().normalize()
        while (dir != null) {
            if (Files.isDirectory(dir.resolve("src-tauri")) &&
                Files.isDirectory(dir.resolve("backend-spring"))
            ) {
                return dir
            }
            dir = dir.parent
        }
        return Path.of("").toAbsolutePath().normalize()
    }
}
