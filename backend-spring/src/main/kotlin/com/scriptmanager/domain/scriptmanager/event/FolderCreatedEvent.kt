package com.scriptmanager.domain.scriptmanager.event


import com.scriptmanager.common.entity.ScriptsFolderDTO

data class FolderCreatedEvent(
    val folder: ScriptsFolderDTO
)

