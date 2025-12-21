package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.dto.toWorkspaceWithFoldersDTO
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetWorkspaceByIdQuery
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetWorkspaceByIdQueryHandler(
    private val workspaceRepository: WorkspaceRepository
) : QueryHandler<GetWorkspaceByIdQuery, WorkspaceWithFoldersDTO> {

    override fun handle(query: GetWorkspaceByIdQuery): WorkspaceWithFoldersDTO {
        val workspace = workspaceRepository.findByIdOrNull(query.workspaceId)
            ?: throw Exception("Workspace not found")
        return workspace.toWorkspaceWithFoldersDTO()
    }
}

