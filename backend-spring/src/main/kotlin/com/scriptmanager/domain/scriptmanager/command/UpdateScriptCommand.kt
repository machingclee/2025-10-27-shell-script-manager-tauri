package com.scriptmanager.domain.scriptmanager.command


data class UpdateScriptCommand(
    val id: Int,
    val name: String,
    val command: String,
    val showShell: Boolean
)

