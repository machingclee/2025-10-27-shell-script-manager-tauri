package com.scriptmanager.domain.scriptmanager.event

data class ScriptDeletedEvent(
    val scriptId: Int,
    val folderId: Int
)

