package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.TagDTO

data class GetAllTagsQuery(
    val dummy: Boolean = true
) : Query<List<TagDTO>>
