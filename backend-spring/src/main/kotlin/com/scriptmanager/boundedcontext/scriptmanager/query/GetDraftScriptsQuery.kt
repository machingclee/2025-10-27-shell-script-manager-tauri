package com.scriptmanager.boundedcontext.scriptmanager.query

import com.machingclee.domain.util.common.query.interfaces.Query
import com.scriptmanager.common.dto.ShellScriptResponse

/**
 * Query to get all scripts in the system draft folder
 */
class GetDraftScriptsQuery : Query<List<ShellScriptResponse>>

