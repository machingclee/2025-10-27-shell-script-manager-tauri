package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.machingclee.domain.util.common.query.interfaces.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetAllScriptsQuery
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.stereotype.Component

@Component
class GetAllScriptsQueryHandler(
    private val scriptRepository: ShellScriptRepository
) : QueryHandler<GetAllScriptsQuery, List<ShellScriptDTO>> {

    override fun handle(query: GetAllScriptsQuery): List<ShellScriptDTO> {
        return scriptRepository.findAllByOrderByOrderingAsc().map { it.toDTO() }
    }
}

