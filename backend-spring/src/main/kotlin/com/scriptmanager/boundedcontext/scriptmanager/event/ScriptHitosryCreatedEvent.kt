package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.HistoricalShellScriptDTO

data class ScriptHistoryCreatedEvent(
    val history: HistoricalShellScriptDTO
)