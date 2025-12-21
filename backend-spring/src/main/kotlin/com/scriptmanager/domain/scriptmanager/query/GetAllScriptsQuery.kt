package com.scriptmanager.domain.scriptmanager.query

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.domain.infrastructure.Query

/**
 * Query to get all scripts ordered by their ordering value
 */
data class GetAllScriptsQuery(
    val dummy: Boolean = true
) : Query<List<ShellScriptDTO>>

