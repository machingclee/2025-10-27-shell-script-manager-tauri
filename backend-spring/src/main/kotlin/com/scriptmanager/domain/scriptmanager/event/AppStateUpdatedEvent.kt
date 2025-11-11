package com.scriptmanager.domain.scriptmanager.event

import com.scriptmanager.common.entity.AppStateDTO

data class AppStateUpdatedEvent(
    val appState: AppStateDTO
)