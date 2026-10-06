package com.scriptmanager.common.entity

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class EventAuditIdTest {

    @Test
    fun `Hibernate can write the generated IDENTITY back onto the entity`() {
        val event = Event()
        assertEquals(0, event.id)

        event.entityId = 42

        assertEquals(42, event.id)
    }
}
