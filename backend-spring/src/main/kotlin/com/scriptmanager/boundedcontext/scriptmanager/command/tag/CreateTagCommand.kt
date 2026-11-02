package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.Tag

data class CreateTagCommand(
    val name: String,
    val tagFolderId: Int? = null
) : Command<Tag>
