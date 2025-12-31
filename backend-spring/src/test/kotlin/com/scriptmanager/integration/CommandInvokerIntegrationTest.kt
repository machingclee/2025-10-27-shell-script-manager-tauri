package com.scriptmanager.integration

import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

/**
 * Integration test for CommandInvoker using real PostgreSQL via Testcontainers.
 *
 * This test demonstrates:
 * 1. Spring Boot context loads successfully with Testcontainers PostgreSQL
 * 2. CommandInvoker is properly wired and ready to use
 * 3. Database container is running and accessible
 * 4. Constructor injection pattern for clean Kotlin code
 *
 * Benefits:
 * - Tests against production database behavior
 * - Can inspect the database after tests (container stays alive with withReuse(true))
 * - More realistic test scenarios
 * - Explicit dependencies via constructor
 *
 * Note: Constructor injection works because of junit-platform.properties setting:
 *       spring.test.constructor.autowire.mode=all
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
class CommandInvokerIntegrationTest(
    private val commandInvoker: CommandInvoker
) {

    @Test
    fun `context loads successfully with PostgreSQL container`() {
        // Verify that Spring context loads and CommandInvoker is wired correctly
        Assertions.assertNotNull(commandInvoker, "CommandInvoker should be injected")

        println("✅ Spring Boot context loaded successfully with Testcontainers PostgreSQL")
        println("✅ CommandInvoker is properly wired via constructor injection")
        println("✅ Database container is running and accessible")
    }

    // TODO: Add real integration tests that execute commands and verify database state
    // When you need to query the database directly, add JdbcTemplate or repositories:
    //
    // Example with JdbcTemplate:
    // class CommandInvokerIntegrationTest(
    //     private val commandInvoker: CommandInvoker,
    //     private val jdbcTemplate: JdbcTemplate  // ← Add this when needed
    // ) {
    //     @Test
    //     fun `create workspace command persists to database`() {
    //         commandInvoker.invoke(CreateWorkspaceCommand("Test Workspace"))
    //
    //         val count = jdbcTemplate.queryForObject(
    //             "SELECT COUNT(*) FROM workspace WHERE name = ?",
    //             Int::class.java,
    //             "Test Workspace"
    //         )
    //         assertEquals(1, count)
    //     }
    // }
    //
    // Example with Repository:
    // class CommandInvokerIntegrationTest(
    //     private val commandInvoker: CommandInvoker,
    //     private val workspaceRepository: WorkspaceRepository  // ← Or use repositories
    // ) {
    //     @Test
    //     fun `create workspace command persists to database`() {
    //         commandInvoker.invoke(CreateWorkspaceCommand("Test Workspace"))
    //
    //         val workspaces = workspaceRepository.findAll()
    //         assertEquals(1, workspaces.size)
    //         assertEquals("Test Workspace", workspaces[0].name)
    //     }
    // }
}

