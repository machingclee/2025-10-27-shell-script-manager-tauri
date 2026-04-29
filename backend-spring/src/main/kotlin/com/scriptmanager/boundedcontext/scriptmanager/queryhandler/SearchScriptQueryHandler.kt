package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.common.dto.ScriptsWithTotal
import com.scriptmanager.common.dto.SearchScriptQuery
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Component

@Component
class SearchScriptQueryHandler(
    private val shellScriptRepository: ShellScriptRepository
) : QueryHandler<SearchScriptQuery, ScriptsWithTotal> {

    override fun handle(query: SearchScriptQuery): ScriptsWithTotal {
        val pageable = PageRequest.of(query.page, query.size)
        val scriptPage = shellScriptRepository.searchByNameOrCommand(query.search, pageable)
        return ScriptsWithTotal(
            scripts = scriptPage.content.map { it.toDTO() },
            total = scriptPage.totalElements
        )
    }
}

