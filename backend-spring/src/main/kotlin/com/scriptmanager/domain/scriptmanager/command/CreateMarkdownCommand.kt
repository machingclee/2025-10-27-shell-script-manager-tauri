package com.scriptmanager.domain.scriptmanager.command


data class CreateMarkdownCommand(
    val folderId: Int,
    val name: String,
    val content: String
)

