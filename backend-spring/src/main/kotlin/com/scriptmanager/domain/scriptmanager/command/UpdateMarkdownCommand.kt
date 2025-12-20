package com.scriptmanager.domain.scriptmanager.command

data class UpdateMarkdownCommand(
    val scriptId: Int,
    val content: String
)