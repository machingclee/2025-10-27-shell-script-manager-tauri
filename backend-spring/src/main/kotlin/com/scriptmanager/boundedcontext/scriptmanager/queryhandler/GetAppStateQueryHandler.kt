package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAppStateQuery
import com.scriptmanager.common.entity.ApplicationState
import com.scriptmanager.common.entity.ApplicationStateDTO
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
                darkMode = false,
                folderColumnWidth = 280.0
            )
            appStateRepository.save(created)
        }

        return ApplicationStateDTO(
            id = state.id!!,
            lastOpenedFolderId = state.lastOpenedFolderId,
            darkMode = state.darkMode,
            folderColumnWidth = state.folderColumnWidth ?: 280.0,
            createdAt = state.createdAt ?: 0.0,
            createdAtHk = state.createdAtHk ?: ""
        )
    }
}

