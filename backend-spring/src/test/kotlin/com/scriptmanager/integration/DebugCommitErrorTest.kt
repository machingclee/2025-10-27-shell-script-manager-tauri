package com.scriptmanager.integration

import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.scriptmanager.command.CreateWorkspaceCommand
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

/**
 * Test to capture and print the full exception stack trace.
 */
@SpringBootTest
@Import(TestcontainersConfiguration::class)
@ActiveProfiles("test")
class DebugCommitErrorTest(
    private val commandInvoker: CommandInvoker
) {

    @Test
    fun `debug commit error with full stack trace`() {
        println("\n========================================")
        println("Starting test to debug commit error...")
        println("========================================\n")

        try {
            val result = commandInvoker.invoke(CreateWorkspaceCommand("DebugTest123"))
            println("\n✅ SUCCESS! Command executed without error")
            println("Result: $result")
        } catch (e: Exception) {
            println("\n❌ ERROR CAUGHT!")
            println("Error type: ${e::class.java.name}")
            println("Error message: ${e.message}")
            println("\nFull stack trace:")
            e.printStackTrace()

            println("\nCause chain:")
            var cause: Throwable? = e.cause
            var level = 1
            while (cause != null) {
                println("  Cause $level: ${cause::class.java.name}: ${cause.message}")
                cause = cause.cause
                level++
            }

            println("\n========================================")
            throw e // Re-throw so test fails
        }
    }
}

