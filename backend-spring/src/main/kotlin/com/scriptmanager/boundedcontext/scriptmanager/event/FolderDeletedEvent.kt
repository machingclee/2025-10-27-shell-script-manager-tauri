package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.ScriptsFolderDTO


data class FolderDeletedEvent(
    val folder: ScriptsFolderDTO
)

