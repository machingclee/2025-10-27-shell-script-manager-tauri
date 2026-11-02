package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.TagFolderDTO

data class GetTagFolderByIdQuery(
    val tagFolderId: Int
) : Query<TagFolderDTO>
