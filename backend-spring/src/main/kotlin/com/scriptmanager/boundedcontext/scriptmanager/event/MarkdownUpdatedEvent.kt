package com.scriptmanager.boundedcontext.scriptmanager.event

data class MarkdownUpdatedEvent(
    val scriptId: Int,
    val content: String
)