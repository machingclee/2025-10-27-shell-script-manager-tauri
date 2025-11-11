package com.scriptmanager.domain.scriptmanager.command

data class ReorderWorkspacesCommand(
    val fromIndex: Int,
    val toIndex: Int
)

