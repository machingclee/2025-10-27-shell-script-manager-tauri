package com.scriptmanager.boundedcontext.scriptmanager.commandhandler


import com.scriptmanager.common.entity.ApplicationState
import com.scriptmanager.common.entity.ApplicationStateDTO
import com.scriptmanager.common.domainutils.CommandHandler
import com.scriptmanager.common.domainutils.EventQueue
import com.scriptmanager.boundedcontext.scriptmanager.command.appstate.UpdateAppStateCommand
import com.scriptmanager.boundedcontext.scriptmanager.event.AppStateUpdatedEvent
import com.scriptmanager.repository.ApplicationStateRepository
import org.springframework.stereotype.Component


@Component
class UpdateAppStateHandler(
    private val appStateRepository: ApplicationStateRepository
) : CommandHandler<UpdateAppStateCommand, ApplicationStateDTO> {

    override fun handle(eventQueue: EventQueue, command: UpdateAppStateCommand): ApplicationStateDTO {
        val current = appStateRepository.findFirstByOrderByIdAsc()

        val toSave = if (current == null) {
            // Create new if doesn't exist
            ApplicationState(
                lastOpenedFolderId = command.lastOpenedFolderId,
                darkMode = command.darkMode ?: false
            )
        } else {
            // Update existing - only update fields that are provided
            current.apply {
                command.lastOpenedFolderId?.let { lastOpenedFolderId = it }
                command.darkMode?.let { darkMode = it }
                command.selectedAiProfileId?.let { selectedAiProfileId = it }
            }
        }

        val saved = appStateRepository.save(toSave)

        val dto = ApplicationStateDTO(
            id = saved.id,
            lastOpenedFolderId = saved.lastOpenedFolderId,
            selectedAiprofileId = saved.selectedAiProfileId,
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

    override fun declareEvents(): List<Class<*>> = listOf(
        AppStateUpdatedEvent::class.java
    )
}