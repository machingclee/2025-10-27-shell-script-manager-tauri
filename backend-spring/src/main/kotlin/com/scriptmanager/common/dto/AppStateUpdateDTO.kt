package com.scriptmanager.common.dto

/**
 * DTO for partial updates to AppState
 * All fields are nullable to support partial updates from the frontend
 */
data class AppStateUpdateDTO(
    val lastOpenedFolderId: Int? = null,
    val darkMode: Boolean? = null
)

