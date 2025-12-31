package com.scriptmanager.integration

import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import org.junit.jupiter.api.*
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

/**
 * Test class for data setup - runs FIRST to inject test data.
 *
 * This uses @TestMethodOrder(MethodOrderer.OrderAnnotation) to control execution order.
 * Combined with @TestClassOrder on a test suite, this ensures data is set up before other tests run.
 *
 * The database connection is shared via Testcontainers' withReuse(true) setting.
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)  // Share instance across all test methods
class DataSetupTest(
    private val commandInvoker: CommandInvoker
) {

    @Test
    @Order(1)
    fun `01 - setup workspaces`() {
        println("🔧 Setting up test workspaces...")

        // TODO: Add your workspace creation commands
        // Example:
        // commandInvoker.invoke(CreateWorkspaceCommand("Test Workspace 1"))
        // commandInvoker.invoke(CreateWorkspaceCommand("Test Workspace 2"))

        println("✅ Workspaces created")
    }

    @Test
    @Order(2)
    fun `02 - setup folders`() {
        println("🔧 Setting up test folders...")

        // TODO: Add your folder creation commands
        // Example:
        // commandInvoker.invoke(CreateFolderCommand("Test Folder"))

        println("✅ Folders created")
    }

    @Test
    @Order(3)
    fun `03 - setup scripts`() {
        println("🔧 Setting up test scripts...")

        // TODO: Add your script creation commands
        // Example:
        // commandInvoker.invoke(CreateScriptCommand(name = "Test Script", content = "echo 'test'"))

        println("✅ Scripts created")
    }

    @Test
    @Order(4)
    fun `04 - verify data setup complete`() {
        println("✅ Data setup complete - all test data injected")

        // TODO: Add verification queries
        // Example:
        // val workspaces = workspaceRepository.findAll()
        // assertTrue(workspaces.isNotEmpty(), "Workspaces should be created")
    }
}

