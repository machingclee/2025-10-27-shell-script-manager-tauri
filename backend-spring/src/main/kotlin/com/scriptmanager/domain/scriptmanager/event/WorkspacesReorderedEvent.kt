package com.scriptmanager.domain.scriptmanager.event


data class WorkspacesReorderedEvent(
    val fromIndex: Int,
    val toIndex: Int
)

