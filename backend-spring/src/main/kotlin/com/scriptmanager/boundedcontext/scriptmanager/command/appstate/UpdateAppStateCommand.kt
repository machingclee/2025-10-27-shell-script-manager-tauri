package com.scriptmanager.boundedcontext.scriptmanager.command.appstate

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.ApplicationStateDTO

data class UpdateAppStateCommand(
    val id: Int?,
    val lastOpenedFolderId: Int?,
    val darkMode: Boolean,
    val createdAt: Double?,
    val createdAtHk: String?,
) : Command<ApplicationStateDTO>
