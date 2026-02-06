package com.scriptmanager.boundedcontext.scriptmanager.event


data class ScriptMovedToFolderEvent(
    val scriptId: Int,
    val targetFolderId: Int
)

