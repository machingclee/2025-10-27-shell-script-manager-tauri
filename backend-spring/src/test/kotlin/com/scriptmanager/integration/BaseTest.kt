package com.scriptmanager.integration

import com.scriptmanager.repository.EventRepository
import org.junit.jupiter.api.BeforeEach
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import com.scriptmanager.config.TestcontainersConfiguration


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

