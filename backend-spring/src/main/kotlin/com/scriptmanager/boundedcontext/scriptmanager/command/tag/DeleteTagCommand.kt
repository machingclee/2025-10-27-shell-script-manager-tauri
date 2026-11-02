package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command

data class DeleteTagCommand(
    val tagId: Int
) : Command<Unit>
