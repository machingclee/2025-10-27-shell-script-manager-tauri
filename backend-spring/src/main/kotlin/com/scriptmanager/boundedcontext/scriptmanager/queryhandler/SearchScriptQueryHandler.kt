package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.common.dto.ScriptsWithTotal
import com.scriptmanager.common.dto.SearchScriptQuery
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ShellScript
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Component

@Component
class SearchScriptQueryHandler(
    private val shellScriptRepository: ShellScriptRepository
) : QueryHandler<SearchScriptQuery, ScriptsWithTotal> {

    override fun handle(query: SearchScriptQuery): ScriptsWithTotal {
        val text = query.search.trim()
        val tagId = query.tagId
        if (text.isEmpty() && tagId == null) {
            return ScriptsWithTotal(scripts = emptyList(), total = 0)
        }
        val pageable = PageRequest.of(query.page, query.size)
        val scriptPage = when {
            text.isNotEmpty() && tagId != null ->
                shellScriptRepository.searchByNameOrCommandAndTagId(text, tagId, pageable)
            text.isNotEmpty() ->
                shellScriptRepository.searchByNameOrCommand(text, pageable)
            tagId != null ->
                shellScriptRepository.searchByAnyTagId(listOf(tagId), pageable)
            else -> return ScriptsWithTotal(scripts = emptyList(), total = 0)
        }
        val ids = scriptPage.content.mapNotNull { it.id }
        if (ids.isNotEmpty()) shellScriptRepository.fetchAssignedTags(ids)
        return ScriptsWithTotal(
            // parentFolderId = workspace-level root folder (direct child of workspace),
            // not the script's immediate containing folder.
            scripts = scriptPage.content.map { script ->
                script.toResponse().copy(parentFolderId = script.resolveWorkspaceRootFolderId())
            },
            total = scriptPage.totalElements
        )
    }

    /**
     * Walks up the folder hierarchy until [ScriptsFolder.parentFolder] is null.
     * That folder is a direct child of a workspace (or a top-level root folder).
     */
    private fun ShellScript.resolveWorkspaceRootFolderId(): Int? {
        var current: ScriptsFolder? = parentFolder
        while (current?.parentFolder != null) {
            current = current.parentFolder
        }
        return current?.id
    }
}

