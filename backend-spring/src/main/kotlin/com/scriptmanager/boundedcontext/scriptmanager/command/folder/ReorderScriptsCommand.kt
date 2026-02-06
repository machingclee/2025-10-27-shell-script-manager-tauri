package com.scriptmanager.boundedcontext.scriptmanager.command.folder

import com.scriptmanager.common.domainutils.Command

data class ReorderScriptsCommand(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
) : Command<Unit>

