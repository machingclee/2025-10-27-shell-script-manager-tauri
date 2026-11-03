package com.scriptmanager.boundedcontext.scriptmanager.event

data class TagUnassignedFromScriptEvent(
    val scriptId: Int,
    val tagId: Int,
    val assignedTagId: Int
)
