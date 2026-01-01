package com.scriptmanager.config

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.springframework.core.io.ClassPathResource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName
import java.sql.DriverManager
import java.time.Duration


@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

    /**
     * PostgreSQL container that will be shared across all tests.
     * Using singleton pattern to avoid spinning up multiple containers.
     *
     * Applies Prisma schema from src-tauri/prisma/schema.prisma if available.
     */
    @Bean
    @ServiceConnection
    fun postgresContainer(): PostgreSQLContainer<*> {
        val container = PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .withStartupTimeout(Duration.ofMinutes(2))
            .withReuse(true) // Reuse container across test runs for faster execution

        container.start()
        printConnectionInfo(container)

        println()

        // Check if schema already exists (for container reuse)
        if (schemaExists(container)) {
            println("✅ Schema already exists - skipping migration (container reuse)")
            println("🧹 Truncating all tables to clear test data...")
            truncateAllTables(container)
            verifySchema(container)
        } else {
            println("📄 Applying schema from schema.sql file (first time)...")
            applySchemaFromFile(container)
            println("✅ Schema applied successfully!")
            println()
            verifySchema(container)
        }

        println()

        return container
    }

    /**
     * Truncates all tables to clear data while preserving schema.
     * This is called before each Spring context creation to ensure test isolation.
     */
    private fun truncateAllTables(container: PostgreSQLContainer<*>) {
        try {
            DriverManager.getConnection(
                container.jdbcUrl,
                container.username,
                container.password
            ).use { connection ->
                connection.autoCommit = false
                try {
                    connection.createStatement().use { statement ->
                        // Get all table names
                        val tables = mutableListOf<String>()
                        val rs = statement.executeQuery(
                            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                        )
                        while (rs.next()) {
                            tables.add(rs.getString("tablename"))
                        }
                        rs.close()

                        if (tables.isNotEmpty()) {
                            // Disable foreign key checks temporarily, truncate all tables, then re-enable
                            val tableList = tables.joinToString(", ") { "\"$it\"" }
                            statement.execute("TRUNCATE TABLE $tableList RESTART IDENTITY CASCADE")
                            connection.commit()
                            println("   ✓ Truncated ${tables.size} table(s): ${tables.joinToString(", ")}")
                        } else {
                            println("   ℹ️  No tables to truncate")
                        }
                    }
                } catch (e: Exception) {
                    connection.rollback()
                    throw e
                }
            }
        } catch (e: Exception) {
            println("   ⚠️  Could not truncate tables: ${e.message}")
            e.printStackTrace()
            throw RuntimeException("Failed to truncate tables", e)
        }
    }

    /**
     * Checks if the schema has already been applied by looking for key tables.
     * Returns true if tables exist, false otherwise.
     */
    private fun schemaExists(container: PostgreSQLContainer<*>): Boolean {
        try {
            DriverManager.getConnection(
                container.jdbcUrl,
                container.username,
                container.password
            ).use { connection ->
                val statement = connection.createStatement()
                val resultSet = statement.executeQuery(
                    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
                )

                if (resultSet.next()) {
                    val tableCount = resultSet.getInt("count")
                    if (tableCount > 0) {
                        println("   ℹ️  Found $tableCount existing table(s) in database")
                        return true
                    }
                }
                return false
            }
        } catch (e: Exception) {
            println("   ⚠️  Could not check if schema exists: ${e.message}")
            return false
        }
    }


    /**
     * Applies the schema.sql file to the PostgreSQL container.
     * This reads the schema file from test resources and executes it.
     * SQL statements are split and executed individually.
     */
    private fun applySchemaFromFile(container: PostgreSQLContainer<*>) {
        try {
            val schemaResource = ClassPathResource("schema.sql")
            if (!schemaResource.exists()) {
                println("   ⚠️  WARNING: schema.sql file not found in test resources!")
                return
            }

            val schemaContent = schemaResource.inputStream.bufferedReader().use { it.readText() }
            println("   📖 Schema file size: ${schemaContent.length} bytes")

            // More robust SQL statement splitting
            val sqlStatements = splitSqlStatements(schemaContent)
            println("   📝 Found ${sqlStatements.size} SQL statements to execute")

            // Connect to the database
            DriverManager.getConnection(
                container.jdbcUrl,
                container.username,
                container.password
            ).use { connection ->
                connection.autoCommit = false

                try {
                    connection.createStatement().use { statement ->
                        var successCount = 0
                        sqlStatements.forEachIndexed { index, sql ->
                            try {
                                val trimmedSql = sql.trim()
                                if (trimmedSql.isNotEmpty()) {
                                    println("   [${index + 1}/${sqlStatements.size}] Executing: ${trimmedSql.take(60)}...")
                                    statement.execute(trimmedSql)
                                    successCount++
                                }
                            } catch (e: Exception) {
                                println("   ✗ Failed to execute statement ${index + 1}:")
                                println("   ${sql.take(200)}...")
                                println("   Error: ${e.message}")
                                connection.rollback()
                                throw e
                            }
                        }
                        connection.commit()
                        println("   ✓ Successfully executed $successCount SQL statements")
                    }
                } catch (e: Exception) {
                    connection.rollback()
                    throw e
                }
            }
        } catch (e: Exception) {
            println("   ✗ Error applying schema: ${e.message}")
            e.printStackTrace()
            throw RuntimeException("Failed to apply schema.sql", e)
        }
    }

    /**
     * More robust SQL statement splitting that handles:
     * - Multi-line statements
     * - Comments (-- and /* */)
     * - Semicolons within strings
     */
    private fun splitSqlStatements(sql: String): List<String> {
        val statements = mutableListOf<String>()
        val currentStatement = StringBuilder()
        var inSingleLineComment = false
        var inMultiLineComment = false
        var inString = false
        var stringChar = '\u0000'

        val lines = sql.lines()
        for (line in lines) {
            var i = 0
            while (i < line.length) {
                val char = line[i]
                val nextChar = if (i + 1 < line.length) line[i + 1] else '\u0000'

                // Handle single-line comments
                if (!inString && !inMultiLineComment && char == '-' && nextChar == '-') {
                    inSingleLineComment = true
                    i++
                    continue
                }

                // Handle multi-line comments
                if (!inString && !inSingleLineComment && char == '/' && nextChar == '*') {
                    inMultiLineComment = true
                    i += 2
                    continue
                }

                if (inMultiLineComment && char == '*' && nextChar == '/') {
                    inMultiLineComment = false
                    i += 2
                    continue
                }

                // Skip if in comment
                if (inSingleLineComment || inMultiLineComment) {
                    i++
                    continue
                }

                // Handle strings
                if ((char == '\'' || char == '"') && !inString) {
                    inString = true
                    stringChar = char
                    currentStatement.append(char)
                } else if (inString && char == stringChar) {
                    // Check for escaped quotes
                    if (nextChar == stringChar) {
                        currentStatement.append(char).append(nextChar)
                        i += 2
                        continue
                    } else {
                        inString = false
                        currentStatement.append(char)
                    }
                } else if (!inString && char == ';') {
                    // Statement terminator found
                    val statement = currentStatement.toString().trim()
                    if (statement.isNotEmpty()) {
                        statements.add(statement)
                    }
                    currentStatement.clear()
                } else {
                    currentStatement.append(char)
                }

                i++
            }

            // Reset single-line comment flag at end of line
            inSingleLineComment = false
            currentStatement.append('\n')
        }

        // Add any remaining statement
        val lastStatement = currentStatement.toString().trim()
        if (lastStatement.isNotEmpty()) {
            statements.add(lastStatement)
        }

        return statements
    }

    /**
     * Verifies that the schema was applied by listing all tables
     */
    private fun verifySchema(container: PostgreSQLContainer<*>) {
        try {
            DriverManager.getConnection(
                container.jdbcUrl,
                container.username,
                container.password
            ).use { connection ->
                val statement = connection.createStatement()
                val resultSet = statement.executeQuery(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )

                val tables = mutableListOf<String>()
                while (resultSet.next()) {
                    tables.add(resultSet.getString("table_name"))
                }

                if (tables.isEmpty()) {
                    println("   ⚠️  WARNING: No tables found in the database!")
                } else {
                    println("   ✓ Verified ${tables.size} table(s) created:")
                    tables.sorted().forEach { tableName ->
                        println("      • $tableName")
                    }
                }
            }
        } catch (e: Exception) {
            println("   ⚠️  Could not verify schema: ${e.message}")
        }
    }

    /**
     * Prints connection information for connecting with GUI tools (DataGrip, DBeaver, etc.)
     */
    private fun printConnectionInfo(container: PostgreSQLContainer<*>) {
        val host = container.host
        val port = container.getMappedPort(5432)
        val database = container.databaseName
        val username = container.username
        val password = container.password
        val jdbcUrl = container.jdbcUrl

        println("=".repeat(80))
        println("🔗 TESTCONTAINERS DATABASE CONNECTION INFO")
        println("=".repeat(80))
        println("📍 Host:     $host")
        println("🔌 Port:     $port")
        println("💾 Database: $database")
        println("👤 Username: $username")
        println("🔑 Password: $password")
        println("🔗 JDBC URL: $jdbcUrl")
        println()
        println("📊 GUI Tool Connection (DataGrip, DBeaver, TablePlus, etc.):")
        println("   Host: $host")
        println("   Port: $port")
        println("   Database: $database")
        println("   User: $username")
        println("   Password: $password")
        println()
        println("🐘 psql command:")
        println("   docker exec -it \$(docker ps | grep postgres | awk '{print \$1}') psql -U $username -d $database")
        println()
        println("💡 Container will stay alive with reuse=true")
        println("   To find it: docker ps | grep postgres")
        println("=".repeat(80))
    }
}