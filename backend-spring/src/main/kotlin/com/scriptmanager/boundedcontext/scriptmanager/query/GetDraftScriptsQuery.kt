package com.scriptmanager.boundedcontext.scriptmanager.query

import com.scriptmanager.common.dto.ShellScriptResponse
import com.scriptmanager.common.domainutils.Query

/**
 * Query to get all scripts in the system draft folder
 */
class GetDraftScriptsQuery : Query<List<ShellScriptResponse>>

