package com.scriptmanager.domain.scriptmanager.event

data class MarkdownCreatedEvent(
    val scriptId: Int,
    val content: String
)