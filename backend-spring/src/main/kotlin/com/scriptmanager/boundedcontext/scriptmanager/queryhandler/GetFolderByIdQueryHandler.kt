package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetFolderByIdQuery
import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetFolderByIdQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetFolderByIdQuery, ScriptsFolderResponse> {

    override fun handle(query: GetFolderByIdQuery): ScriptsFolderResponse {
        val folder = folderRepository.findByIdOrNull(query.folderId)
            ?: throw ScriptManagerException("Folder not found with id: ${query.folderId}")
        return folder.toResponse()
    }
}

