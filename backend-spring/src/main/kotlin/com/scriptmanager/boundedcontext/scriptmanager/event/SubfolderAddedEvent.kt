package com.scriptmanager.boundedcontext.scriptmanager.event


import com.scriptmanager.common.entity.ScriptsFolderDTO

data class SubfolderAddedEvent(
    val parentFolderId: Int,
    val subfolder: ScriptsFolderDTO
)

