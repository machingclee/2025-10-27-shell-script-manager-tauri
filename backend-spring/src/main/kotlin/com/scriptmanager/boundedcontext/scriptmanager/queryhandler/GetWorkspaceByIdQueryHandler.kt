package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.dto.WorkspaceWithFoldersDTO
import com.scriptmanager.common.dto.toWorkspaceWithFoldersDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetWorkspaceByIdQuery
import com.scriptmanager.repository.WorkspaceRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetWorkspaceByIdQueryHandler(
    private val workspaceRepository: WorkspaceRepository
) : QueryHandler<GetWorkspaceByIdQuery, WorkspaceWithFoldersDTO> {

    override fun handle(query: GetWorkspaceByIdQuery): WorkspaceWithFoldersDTO {
        val workspace = workspaceRepository.findByIdOrNull(query.workspaceId)
            ?: throw ScriptManagerException("Workspace not found")
        return workspace.toWorkspaceWithFoldersDTO()
    }
}

