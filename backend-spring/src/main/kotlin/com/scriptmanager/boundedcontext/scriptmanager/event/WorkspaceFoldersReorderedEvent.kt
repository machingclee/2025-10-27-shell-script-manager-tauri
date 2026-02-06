package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.ScriptsFolderDTO


data class WorkspaceFoldersReorderedEvent(
    val workspaceId: Int,
    val movedFolder: ScriptsFolderDTO,
    val fromIndex: Int,
    val toIndex: Int
)

