package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.machingclee.domain.util.common.interfaces.Command

data class ReorderScriptsCommand(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

