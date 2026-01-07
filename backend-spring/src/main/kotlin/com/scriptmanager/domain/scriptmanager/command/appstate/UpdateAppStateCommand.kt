package com.scriptmanager.domain.scriptmanager.command.appstate

import com.scriptmanager.common.entity.ApplicationStateDTO
import com.scriptmanager.domain.infrastructure.Command

data class UpdateAppStateCommand(
    val id: Int?,
    val lastOpenedFolderId: Int?,
    val selectedAiProfileId: Int?,
    val darkMode: Boolean,
    val createdAt: Double?,
    val createdAtHk: String?,
) : Command<ApplicationStateDTO>
