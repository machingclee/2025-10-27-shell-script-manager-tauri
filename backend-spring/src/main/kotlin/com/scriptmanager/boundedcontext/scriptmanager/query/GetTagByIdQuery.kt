package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.TagDTO

data class GetTagByIdQuery(
    val tagId: Int
) : Query<TagDTO>
