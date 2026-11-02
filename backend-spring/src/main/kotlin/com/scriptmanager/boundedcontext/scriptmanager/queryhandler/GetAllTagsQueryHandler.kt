package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllTagsQuery
import com.scriptmanager.common.entity.TagDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.TagRepository
import org.springframework.stereotype.Component

@Component
class GetAllTagsQueryHandler(
    private val tagRepository: TagRepository
) : QueryHandler<GetAllTagsQuery, List<TagDTO>> {

    override fun handle(query: GetAllTagsQuery): List<TagDTO> {
        return tagRepository.findAllOrderByName().map { it.toDTO() }
    }
}
