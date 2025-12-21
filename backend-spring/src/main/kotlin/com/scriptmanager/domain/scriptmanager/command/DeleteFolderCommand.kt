package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class DeleteFolderCommand(
    val id: Int
) : Command<Unit>

