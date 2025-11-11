package com.scriptmanager.domain.scriptmanager.event


data class FoldersReorderedEvent(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
    val fromIndex: Int,
    val toIndex: Int
)

