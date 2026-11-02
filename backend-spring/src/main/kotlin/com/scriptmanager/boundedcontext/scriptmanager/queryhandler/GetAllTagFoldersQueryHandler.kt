package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllTagFoldersQuery
import com.scriptmanager.common.entity.TagFolderDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.TagFolderRepository
import org.springframework.stereotype.Component

@Component
class GetAllTagFoldersQueryHandler(
    private val tagFolderRepository: TagFolderRepository
) : QueryHandler<GetAllTagFoldersQuery, List<TagFolderDTO>> {

    override fun handle(query: GetAllTagFoldersQuery): List<TagFolderDTO> {
        return tagFolderRepository.findAllOrderByOrdering().map { it.toDTO() }
    }
}
