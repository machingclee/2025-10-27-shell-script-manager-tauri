package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.TagDTO

data class UpdateTagCommand(
    val id: Int,
    val name: String,
    val tagFolderId: Int? = null
) : Command<TagDTO>
