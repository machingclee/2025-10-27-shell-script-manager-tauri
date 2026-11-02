package com.scriptmanager.boundedcontext.scriptmanager.command.tag

import com.machingclee.domain.util.common.interfaces.Command
import com.scriptmanager.common.entity.TagFolder

data class CreateTagFolderCommand(
    val name: String
) : Command<TagFolder>
