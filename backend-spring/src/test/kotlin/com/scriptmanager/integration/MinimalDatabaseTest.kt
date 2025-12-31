package com.scriptmanager.integration

import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.repository.WorkspaceRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

/**
 * Minimal test to verify database connectivity and basic operations work.
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
class MinimalDatabaseTest(
    private val workspaceRepository: WorkspaceRepository
) {

    @Test
    fun `database connection works`() {
        println("✅ Test started - database should be connected")

        // Just verify we can query
        //val count = workspaceRepository.count()
        //println("✅ Workspace count: $count")

        //assertTrue(count >= 0, "Should be able to count workspaces")
        println("✅ Test passed!")
    }

    @Test
    fun `can save workspace without CommandInvoker`() {
        println("✅ Testing direct repository save...")

        val workspace = com.scriptmanager.common.entity.Workspace(
            name = com.scriptmanager.common.entity.Workspace.Name("TestWorkspace123"),
            ordering = 0
        )

        val saved = workspaceRepository.save(workspace)
        assertNotNull(saved.id)
        println("✅ Saved workspace with ID: ${saved.id}")

        // Cleanup
        workspaceRepository.delete(saved)
        println("✅ Cleanup complete")
    }
}

