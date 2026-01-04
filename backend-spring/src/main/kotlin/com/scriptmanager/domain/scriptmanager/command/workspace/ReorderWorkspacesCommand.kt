package com.scriptmanager.domain.scriptmanager.command.workspace

import com.scriptmanager.domain.infrastructure.Command

data class ReorderWorkspacesCommand(
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

