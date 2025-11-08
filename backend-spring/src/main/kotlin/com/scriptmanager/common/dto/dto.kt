package com.scriptmanager.common.dto

import com.scriptmanager.common.entity.ScriptsFolder
import com.scriptmanager.common.entity.ScriptsFolderDTO
import com.scriptmanager.common.entity.ShellScriptDTO
import com.scriptmanager.common.entity.toDTO

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
    val parentFolderId: Int?,
    val fromIndex: Int,
    val toIndex: Int
)

data class ReorderScriptsRequest(
    val folderId: Int,
    val fromIndex: Int,
    val toIndex: Int
)

data class CreateFolderRequest(
    val name: String
)

data class ScriptsFolderResponse(
    val id: Int?,
    val name: String,
    val ordering: Int,
    val createdAt: Double?,
    val createdAtHk: String?,
    val shellScripts: List<ShellScriptDTO>,
    val parentFolder: ScriptsFolderDTO? = null,
    val subfolders: List<ScriptsFolderResponse>
)


fun ScriptsFolder.toResponse(): ScriptsFolderResponse {
    if (this.subfolders.isEmpty()) {
        return ScriptsFolderResponse(
            id = this.id,
            name = this.name,
            ordering = this.ordering,
            createdAt = this.createdAt,
            createdAtHk = this.createdAtHk,
            shellScripts = this.shellScripts.map { it.toDTO() },
            parentFolder = this.parentFolder?.toDTO(),
            subfolders = emptyList()
        )
    }

    return ScriptsFolderResponse(
        id = this.id,
        name = this.name,
        ordering = this.ordering,
        createdAt = this.createdAt,
        createdAtHk = this.createdAtHk,
        shellScripts = this.shellScripts.map { it.toDTO() },
        parentFolder = this.parentFolder?.toDTO(),
        subfolders = this.subfolders?.map { it.toResponse() }?.toList()?.sortedBy { it.ordering } ?: emptyList()
    )
}

data class CreateSubfolderRequest(
    val name: String
)

