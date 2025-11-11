package com.scriptmanager.domain.scriptmanager.command


data class UpdateFolderCommand(
    val id: Int,
    val name: String,
    val ordering: Int
)

