package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.TagFolderDTO

data class TagFolderDeletedEvent(
    val tagFolder: TagFolderDTO
)
