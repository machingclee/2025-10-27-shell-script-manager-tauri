package com.scriptmanager.integration.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.scriptmanager.common.dto.CreateFolderRequest
import com.scriptmanager.config.TestcontainersConfiguration
import com.scriptmanager.repository.EventRepository
import com.scriptmanager.repository.ScriptsFolderRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
class FolderControllerTest(
    private val mockMvc: MockMvc,
    private val objectMapper: ObjectMapper,
    private val eventRepository: EventRepository,
    private val folderRepository: ScriptsFolderRepository
) {

    @BeforeEach
    fun setUp() {
        eventRepository.deleteAll()
    }

    @Test
    fun `should create folder with required headers`() {
        // Arrange
        val folderName = "TestFolder_${System.currentTimeMillis()}"
        val request = CreateFolderRequest(name = folderName)
        val requestJson = objectMapper.writeValueAsString(request)

        // Act & Assert
        mockMvc.perform(
            post("/folders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
                // Add required headers
                .header("X-User-ID", "test-user")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.result.name").value(folderName))

        // Verify folder was persisted
        val folders = folderRepository.findAll()
        assert(folders.any { it.name == folderName })
    }
}

