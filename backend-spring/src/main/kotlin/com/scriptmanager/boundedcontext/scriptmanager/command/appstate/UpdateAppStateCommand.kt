package com.scriptmanager.boundedcontext.scriptmanager.command.appstate

import com.scriptmanager.common.entity.ApplicationStateDTO
import com.scriptmanager.common.domainutils.Command

data class UpdateAppStateCommand(
    val id: Int?,
    val lastOpenedFolderId: Int?,
    val selectedAiProfileId: Int?,
    val darkMode: Boolean,
    val createdAt: Double?,
    val createdAtHk: String?,
) : Command<ApplicationStateDTO>
