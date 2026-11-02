package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetTagByIdQuery
import com.scriptmanager.common.entity.TagDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.repository.TagRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetTagByIdQueryHandler(
    private val tagRepository: TagRepository
) : QueryHandler<GetTagByIdQuery, TagDTO> {

    override fun handle(query: GetTagByIdQuery): TagDTO {
        val tag = tagRepository.findByIdOrNull(query.tagId)
            ?: throw ScriptManagerException("Tag not found")
        return tag.toDTO()
    }
}
