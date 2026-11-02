package com.scriptmanager.boundedcontext.scriptmanager.event

data class TagAssignedToScriptEvent(
    val scriptId: Int,
    val tagId: Int,
    val assignedTagId: Int
)
