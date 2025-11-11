package com.scriptmanager.common.utils

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.KotlinModule

object JsonNodeUtil {
    private val objectMapper = ObjectMapper().apply {
        registerModule(KotlinModule.Builder().build())
        configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
    }

    fun <T> toJsonNode(value: T): JsonNode {
        return try {
            when (value) {
                is JsonNode -> value  // If already JsonNode, return as is
                is String -> objectMapper.readTree(value)  // If String, parse directly
                else -> objectMapper.valueToTree(value)    // For other types, convert directly
            }
        } catch (e: Exception) {
            throw Exception("Could not convert to JsonNode: ${e.message}", e)
        }
    }
}


