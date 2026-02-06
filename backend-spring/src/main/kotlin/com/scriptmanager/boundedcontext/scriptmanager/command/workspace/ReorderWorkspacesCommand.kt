package com.scriptmanager.boundedcontext.scriptmanager.command.workspace

import com.scriptmanager.common.domainutils.Command

data class ReorderWorkspacesCommand(
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

