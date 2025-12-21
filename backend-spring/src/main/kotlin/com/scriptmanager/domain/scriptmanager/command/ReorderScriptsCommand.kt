package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class ReorderScriptsCommand(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

