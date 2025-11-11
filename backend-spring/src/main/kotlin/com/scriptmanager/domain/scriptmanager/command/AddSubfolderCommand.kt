package com.scriptmanager.domain.scriptmanager.command

data class AddSubfolderCommand(
    val parentFolderId: Int,
    val name: String
)

