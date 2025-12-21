package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.entity.AppState
import com.scriptmanager.common.entity.AppStateDTO
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetAppStateQuery
import com.scriptmanager.repository.AppStateRepository
import org.springframework.stereotype.Component

@Component
class GetAppStateQueryHandler(
    private val appStateRepository: AppStateRepository
) : QueryHandler<GetAppStateQuery, AppStateDTO> {

    override fun handle(query: GetAppStateQuery): AppStateDTO {
        val state = appStateRepository.findFirstByOrderByIdAsc() ?: run {
            val created = AppState(
                lastOpenedFolderId = null,
                darkMode = false
            )
            appStateRepository.save(created)
        }

        return AppStateDTO(
            id = state.id!!,
            lastOpenedFolderId = state.lastOpenedFolderId,
            darkMode = state.darkMode,
            createdAt = state.createdAt ?: 0.0,
            createdAtHk = state.createdAtHk ?: ""
        )
    }
}

