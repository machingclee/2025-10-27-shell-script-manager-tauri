package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.dto.WorkspaceResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetAllWorkspacesQuery
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.stereotype.Component

@Component
class GetAllWorkspacesQueryHandler(
    private val workspaceRepository: WorkspaceRepository
) : QueryHandler<GetAllWorkspacesQuery, List<WorkspaceResponse>> {

    override fun handle(query: GetAllWorkspacesQuery): List<WorkspaceResponse> {
        return workspaceRepository.findAllFetchingFoldersAndShellScripts()
            .sortedBy { it.ordering }
            .map { it.toResponse() }
    }
}

