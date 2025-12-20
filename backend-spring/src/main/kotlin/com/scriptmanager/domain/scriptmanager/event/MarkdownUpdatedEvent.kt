package com.scriptmanager.domain.scriptmanager.event

data class MarkdownUpdatedEvent(
    val scriptId: Int,
    val content: String
)