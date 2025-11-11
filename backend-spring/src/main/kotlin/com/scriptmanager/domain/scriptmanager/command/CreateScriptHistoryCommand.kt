package com.scriptmanager.domain.scriptmanager.command


data class CreateScriptHistoryCommand(
    val scriptId: Int,
    val time: Long
)