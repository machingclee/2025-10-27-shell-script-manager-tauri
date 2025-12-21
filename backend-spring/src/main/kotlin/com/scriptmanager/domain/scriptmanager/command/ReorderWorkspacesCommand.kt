package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class ReorderWorkspacesCommand(
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

