package com.scriptmanager.domain.scriptmanager.command

data class UpdateWorkspaceCommand(
    val id: Int,
    val name: String,
    val ordering: Int
)

