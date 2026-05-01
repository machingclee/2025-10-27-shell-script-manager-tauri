package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.dto.toResponse
import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetDraftScriptsQuery
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.stereotype.Component

@Component
class GetDraftScriptsQueryHandler(
    private val scriptRepository: ShellScriptRepository
) : QueryHandler<GetDraftScriptsQuery, List<ShellScriptResponse>> {

    override fun handle(query: GetDraftScriptsQuery): List<ShellScriptResponse> {
        return scriptRepository.findDraftScripts().map { it.toResponse() }
    }
}

