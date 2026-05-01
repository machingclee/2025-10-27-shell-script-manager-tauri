package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.dto.ScriptsFolderResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.SystemLevel
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetDraftFolderQuery
import com.scriptmanager.repository.ScriptsFolderRepository
import org.springframework.stereotype.Component

@Component
class GetDraftFolderQueryHandler(
    private val folderRepository: ScriptsFolderRepository
) : QueryHandler<GetDraftFolderQuery, ScriptsFolderResponse> {

    override fun handle(query: GetDraftFolderQuery): ScriptsFolderResponse {
        val folder = folderRepository.findByNameAndSystemLevel("Drafts", SystemLevel.SYSTEM)
            ?: throw ScriptManagerException("Drafts folder not found. Make sure DraftFolderInitialization has run.")
        return folder.toResponse()
    }
}

