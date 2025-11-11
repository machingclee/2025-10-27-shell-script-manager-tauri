package com.scriptmanager.domain.scriptmanager.event

data class ScriptMovedToFolderEvent(
    val scriptId: Int,
    val targetFolderId: Int
)

