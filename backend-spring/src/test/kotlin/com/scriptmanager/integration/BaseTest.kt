package com.scriptmanager.integration

import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.BeforeEach
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import com.scriptmanager.config.TestcontainersConfiguration

/**
 * Base class for integration tests that provides:
 * 1. Real PostgreSQL database via Testcontainers
 * 2. Automatic event table truncation before each test
 * 3. Schema persistence (tables are NOT dropped between tests)
 *
 * Usage:
 * ```kotlin
 * @SpringBootTest
 * class MyIntegrationTest(
 *     private val commandInvoker: CommandInvoker
 * ) : BaseIntegrationTest() {
 *     @Test
 *     fun `my test`() {
 *         // Event table is automatically cleared before this test runs
 *     }
 * }
 * ```
 *
 * Benefits:
 * ✅ Clean event state for each test (no leftover events)
 * ✅ Fast (only truncates events table, not all tables)
 * ✅ Schema persists (no recreation overhead)
 * ✅ Other tables keep their data (if needed for fixtures)
 * ✅ No @DirtiesContext needed (much faster!)
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
class BaseTest(
    private val eventRepository: EventRepository
) {


    /**
     * Truncates the event table before each test to ensure clean state.
     * This runs automatically for all tests that extend this class.
     */
    @BeforeEach
    fun truncateEventsBeforeEachTest() {
        println("🧹 [BaseIntegrationTest] Truncating events table before test...")
        eventRepository.deleteAll()
        println("   ✓ Events table cleared")
    }
}

