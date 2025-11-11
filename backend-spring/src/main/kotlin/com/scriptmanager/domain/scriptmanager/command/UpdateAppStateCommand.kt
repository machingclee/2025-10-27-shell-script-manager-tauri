package com.scriptmanager.domain.scriptmanager.command

data class UpdateAppStateCommand(
    val id: Int?,
    val lastOpenedFolderId: Int?,
    val darkMode: Boolean,
    val createdAt: Double?,
    val createdAtHk: String?,
)