package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.entity.ShellScriptDTO

/**
 * Query to get all scripts ordered by their ordering value
 */
data class GetAllScriptsQuery(
    val dummy: Boolean = true
) : Query<List<ShellScriptDTO>>

