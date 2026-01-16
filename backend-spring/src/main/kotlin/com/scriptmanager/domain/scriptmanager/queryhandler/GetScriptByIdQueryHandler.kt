package com.scriptmanager.domain.scriptmanager.queryhandler

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO
import com.scriptmanager.common.exception.ScriptManagerException
import com.scriptmanager.domain.infrastructure.QueryHandler
import com.scriptmanager.domain.scriptmanager.query.GetScriptByIdQuery
import com.scriptmanager.repository.ShellScriptRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component

@Component
class GetScriptByIdQueryHandler(
    private val scriptRepository: ShellScriptRepository
) : QueryHandler<GetScriptByIdQuery, ShellScriptDTO> {

    override fun handle(query: GetScriptByIdQuery): ShellScriptDTO {
        val script = scriptRepository.findByIdOrNull(query.scriptId)
            ?: throw ScriptManagerException("Script not found")
        return script.toDTO()
    }
}

