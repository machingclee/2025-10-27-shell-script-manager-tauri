package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.TagFolderDTO

data class TagFolderUpdatedEvent(
    val tagFolder: TagFolderDTO
)
