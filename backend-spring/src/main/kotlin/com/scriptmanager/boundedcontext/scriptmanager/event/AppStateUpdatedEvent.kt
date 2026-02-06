package com.scriptmanager.boundedcontext.scriptmanager.event

import com.scriptmanager.common.entity.ApplicationStateDTO

data class AppStateUpdatedEvent(
    val appState: ApplicationStateDTO
)