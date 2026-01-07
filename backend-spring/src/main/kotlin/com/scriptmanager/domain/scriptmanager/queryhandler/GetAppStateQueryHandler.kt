package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.entity.ApplicationState
import com.scriptmanager.common.entity.ApplicationStateDTO
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetAppStateQuery
import com.scriptmanager.repository.AppStateRepository
import org.springframework.stereotype.Component

@Component
class GetAppStateQueryHandler(
    private val appStateRepository: AppStateRepository
) : QueryHandler<GetAppStateQuery, ApplicationStateDTO> {

    override fun handle(query: GetAppStateQuery): ApplicationStateDTO {
        val state = appStateRepository.findFirstByOrderByIdAsc() ?: run {
            val created = ApplicationState(
                lastOpenedFolderId = null,
                darkMode = false
            )
            appStateRepository.save(created)
        }

        return ApplicationStateDTO(
            id = state.id!!,
            lastOpenedFolderId = state.lastOpenedFolderId,
            selectedAiprofileId = state.selectedAiProfileId,
            darkMode = state.darkMode,
            createdAt = state.createdAt ?: 0.0,
            createdAtHk = state.createdAtHk ?: ""
        )
    }
}

