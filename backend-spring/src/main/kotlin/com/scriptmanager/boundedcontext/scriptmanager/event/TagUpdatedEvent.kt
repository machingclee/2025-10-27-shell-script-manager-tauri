package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.TagDTO

data class TagUpdatedEvent(
    val tag: TagDTO
)
