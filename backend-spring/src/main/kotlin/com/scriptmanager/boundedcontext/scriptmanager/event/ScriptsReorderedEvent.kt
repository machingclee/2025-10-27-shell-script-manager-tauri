package com.scriptmanager.boundedcontext.scriptmanager.event


data class ScriptsReorderedEvent(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
)

