package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetFolderContentByIdQuery
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetFolderContentQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetFolderContentByIdQuery, ScriptsFolderResponse> {

    override fun handle(query: GetFolderContentByIdQuery): ScriptsFolderResponse {
        val folder = folderRepository.findByIdOrNull(query.folderId)
            ?: throw Exception("Folder not found with id: ${query.folderId}")
        return folder.toResponse()
    }
}

