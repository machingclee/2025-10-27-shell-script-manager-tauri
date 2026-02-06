package com.scriptmanager.boundedcontext.scriptmanager.command.script

import com.scriptmanager.common.domainutils.Command

data class DeleteScriptCommand(
    val scriptId: Int,
    val folderId: Int
) : Command<Unit>

