package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get all scripts ordered by their ordering value
 */
data class GetAllScriptsQuery(
    val dummy: Boolean = true
) : Query<List<ShellScriptDTO>>

