package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetFolderContentByIdQuery
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetFolderContentQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetFolderContentByIdQuery, ScriptsFolderResponse> {

    override fun handle(query: GetFolderContentByIdQuery): ScriptsFolderResponse {
        val folder = folderRepository.findByIdOrNull(query.folderId)
            ?: throw ScriptManagerException("Folder not found with id: ${query.folderId}")
        return folder.toResponse()
    }
}

