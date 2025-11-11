package com.scriptmanager.domain.scriptmanager.command

data class ReorderScriptsCommand(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
)

