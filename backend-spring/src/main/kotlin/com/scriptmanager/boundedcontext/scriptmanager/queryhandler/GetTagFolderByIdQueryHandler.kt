package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetTagFolderByIdQuery
import com.scriptmanager.common.entity.TagFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetTagFolderByIdQueryHandler(
    private val tagFolderRepository: TagFolderRepository
) : QueryHandler<GetTagFolderByIdQuery, TagFolderDTO> {

    override fun handle(query: GetTagFolderByIdQuery): TagFolderDTO {
        val tagFolder = tagFolderRepository.findByIdOrNull(query.tagFolderId)
            ?: throw ScriptManagerException("Tag folder not found")
        return tagFolder.toDTO()
    }
}
