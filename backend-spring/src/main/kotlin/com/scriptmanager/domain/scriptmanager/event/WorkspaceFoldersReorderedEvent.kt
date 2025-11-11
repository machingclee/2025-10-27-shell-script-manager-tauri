package com.scriptmanager.domain.scriptmanager.event


data class WorkspaceFoldersReorderedEvent(
    val workspaceId: Int,
    val fromIndex: Int,
    val toIndex: Int
)

