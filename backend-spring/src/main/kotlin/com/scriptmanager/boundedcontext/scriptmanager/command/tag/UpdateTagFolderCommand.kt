package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.TagFolderDTO

data class UpdateTagFolderCommand(
    val id: Int,
    val name: String
) : Command<TagFolderDTO>
