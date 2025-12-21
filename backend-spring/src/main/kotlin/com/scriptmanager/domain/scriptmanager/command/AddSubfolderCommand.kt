package com.scriptmanager.domain.scriptmanager.command

import com.scriptmanager.domain.infrastructure.Command

data class AddSubfolderCommand(
    val parentFolderId: Int,
    val name: String
) : Command<Unit>

