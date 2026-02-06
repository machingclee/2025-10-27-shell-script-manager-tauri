package com.scriptmanager.boundedcontext.scriptmanager.event

data class MarkdownCreatedEvent(
    val scriptId: Int,
    val content: String
)