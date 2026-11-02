package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command

data class ReorderTagFoldersCommand(
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>
