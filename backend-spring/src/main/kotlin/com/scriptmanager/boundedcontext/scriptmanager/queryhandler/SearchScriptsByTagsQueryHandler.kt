package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.common.dto.ScriptsWithTotal
import com.scriptmanager.common.dto.SearchScriptsByTagsQuery
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Component

@Component
class SearchScriptsByTagsQueryHandler(
    private val shellScriptRepository: ShellScriptRepository
) : QueryHandler<SearchScriptsByTagsQuery, ScriptsWithTotal> {

    override fun handle(query: SearchScriptsByTagsQuery): ScriptsWithTotal {
        val tagIds = query.tagIds.distinct()
        if (tagIds.isEmpty()) {
            return ScriptsWithTotal(scripts = emptyList(), total = 0)
        }
        val pageable = PageRequest.of(query.page, query.size)
        val scriptPage = shellScriptRepository.searchByAnyTagId(tagIds, pageable)
        val ids = scriptPage.content.mapNotNull { it.id }
        if (ids.isNotEmpty()) shellScriptRepository.fetchAssignedTags(ids)
        return ScriptsWithTotal(
            scripts = scriptPage.content.map { script ->
                script.toResponse().copy(parentFolderId = script.resolveWorkspaceRootFolderId())
            },
            total = scriptPage.totalElements
        )
    }

    private fun ShellScript.resolveWorkspaceRootFolderId(): Int? {
        var current: ScriptsFolder? = parentFolder
        while (current?.parentFolder != null) {
            current = current.parentFolder
        }
        return current?.id
    }
}
