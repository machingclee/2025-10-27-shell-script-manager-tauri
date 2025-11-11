package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.HistoricalShellScriptDTO

data class ScriptHistoryCreatedEvent(
    val history: HistoricalShellScriptDTO
)