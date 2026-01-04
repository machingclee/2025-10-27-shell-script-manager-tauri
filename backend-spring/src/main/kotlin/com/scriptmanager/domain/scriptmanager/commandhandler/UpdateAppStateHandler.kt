package com.scriptmanager.domain.scriptmanager.commandhandler

import com.scriptmanager.common.entity.AppState
import com.scriptmanager.common.entity.AppStateDTO
import com.scriptmanager.domain.infrastructure.CommandHandler
import com.scriptmanager.domain.infrastructure.EventQueue
import com.scriptmanager.domain.scriptmanager.command.app.UpdateAppStateCommand
import com.scriptmanager.domain.scriptmanager.event.AppStateUpdatedEvent
import com.scriptmanager.repository.AppStateRepository
import org.springframework.stereotype.Component


@Component
class UpdateAppStateHandler(
    private val appStateRepository: AppStateRepository
) : CommandHandler<UpdateAppStateCommand, AppStateDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateAppStateCommand): AppStateDTO {
        val current = appStateRepository.findFirstByOrderByIdAsc()

        val toSave = if (current == null) {
            // Create new if doesn't exist
            AppState(
                lastOpenedFolderId = command.lastOpenedFolderId,
                darkMode = command.darkMode ?: false
            )
        } else {
            // Update existing - only update fields that are provided
            current.apply {
                command.lastOpenedFolderId?.let { lastOpenedFolderId = it }
                command.darkMode?.let { darkMode = it }
            }
        }

        val saved = appStateRepository.save(toSave)

        val dto = AppStateDTO(
            id = saved.id,
            lastOpenedFolderId = saved.lastOpenedFolderId,
            darkMode = saved.darkMode,
            createdAt = saved.createdAt ?: 0.0,
            createdAtHk = saved.createdAtHk ?: ""
        )

        //throw Exception("Let me show some exception")

        eventQueue.add(
            AppStateUpdatedEvent(
                appState = dto
            )
        )
        return dto
    }
}