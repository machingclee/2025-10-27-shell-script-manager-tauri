package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetAllRootFoldersQuery
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.stereotype.Component

@Component
class GetAllRootFoldersQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetAllRootFoldersQuery, List<ScriptsFolderResponse>> {

    override fun handle(query: GetAllRootFoldersQuery): List<ScriptsFolderResponse> {
        return folderRepository.findAllRootLevelFolder().map { it.toResponse() }
    }
}

