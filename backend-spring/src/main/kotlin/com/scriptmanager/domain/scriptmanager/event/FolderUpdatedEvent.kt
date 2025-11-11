package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.ScriptsFolderDTO

data class FolderUpdatedEvent(
    val folder: ScriptsFolderDTO
)

