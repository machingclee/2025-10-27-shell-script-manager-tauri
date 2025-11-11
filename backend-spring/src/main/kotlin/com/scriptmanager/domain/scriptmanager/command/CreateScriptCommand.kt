package com.scriptmanager.domain.scriptmanager.command

data class CreateScriptCommand(
    val folderId: Int,
    val name: String,
    val content: String
)

