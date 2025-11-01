package com.scriptmanager.common.dto

import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.ShellScriptDTO

data class ApiResponse<T>(
    val result: T? = null,
    val success: Boolean? = true,
    val message: String? = null,
    // HTTP / application error code (optional). For successful responses this is null.
    val errorCode: Int? = null
)

data class FolderResponse(
    val folder: ScriptsFolderDTO,
    val scripts: List<ShellScriptDTO>
)

data class CreateScriptRequest(
    val name: String,
    val content: String,
    val folderId: Int
)

data class ReorderRequest(
    val fromIndex: Int,
    val toIndex: Int
)

data class ReorderScriptsRequest(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
)