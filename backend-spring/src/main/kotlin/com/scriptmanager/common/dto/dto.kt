package com.scriptmanager.common.dto

import com.scriptmanager.common.entity.*

data class ApiResponse<T>(
    val result: T? = null,
    val success: Boolean? = true,
    val errorMessage: String? = null,
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

data class CreateMarkdownRequest(
    val name: String,
    val content: String,
    val folderId: Int
)

data class ReorderRequest(
    val parentFolderId: Int?,
    val parentWorkspaceId: Int?,
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
    val shellScripts: List<ShellScriptResponse>,
    val parentFolder: ScriptsFolderDTO? = null,
    val parentWorkspace: WorkspaceDTO? = null,
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
            shellScripts = this.shellScripts.sortedBy { it.ordering }.map { it.toResponse() },
            parentFolder = this.parentFolder?.toDTO(),
            parentWorkspace = this.parentWorkspace?.toDTO(),
            subfolders = emptyList()
        )
    }

    return ScriptsFolderResponse(
        id = this.id,
        name = this.name,
        ordering = this.ordering,
        createdAt = this.createdAt,
        createdAtHk = this.createdAtHk,
        shellScripts = this.shellScripts.sortedBy { it.ordering }.map { it.toResponse() },
        parentFolder = this.parentFolder?.toDTO(),
        parentWorkspace = this.parentWorkspace?.toDTO(),
        subfolders = this.subfolders?.map { it.toResponse() }?.toList()?.sortedBy { it.ordering } ?: emptyList()
    )
}

fun ShellScript.toResponse(): ShellScriptResponse {
    return ShellScriptResponse(
        id = this.id,
        name = this.name,
        command = this.command,
        ordering = this.ordering,
        locked = this.locked!!,
        showShell = this.showShell,
        createdAt = this.createdAt,
        createdAtHk = this.createdAtHk,
        parentFolderId = this.parentFolder?.id,
        isMarkdown = this.isMarkdown ?: false
    )
}


data class ShellScriptResponse(
    val id: Int?,
    val name: String,
    val command: String,
    val ordering: Int,
    val locked: Boolean,
    val showShell: Boolean,
    val createdAt: Double?,
    val createdAtHk: String?,
    val parentFolderId: Int?,
    val isMarkdown: Boolean
)

data class CreateSubfolderRequest(
    val name: String
)

data class WorkspaceFolderResponse(
    public val id: Int?,
    public val name: String,
    public val ordering: Int,
    public val createdAt: Double?,
    public val createdAtHk: String?,
    public val parentWorkspaceId: Int?,
)

data class WorkspaceWithFoldersDTO(
    val id: Int?,
    val name: String,
    val ordering: Int,
    val createdAt: Double?,
    val createdAtHk: String?,
    val folders: List<WorkspaceFolderResponse>
)

fun Workspace.toWorkspaceWithFoldersDTO(): WorkspaceWithFoldersDTO {
    return WorkspaceWithFoldersDTO(
        id = this.id,
        name = this.name.value,
        ordering = this.ordering,
        createdAt = this.createdAt,
        createdAtHk = this.createdAtHk,
        folders = this.folders.sortedBy { it.ordering }.map {
            WorkspaceFolderResponse(
                id = it.id,
                name = it.name,
                ordering = it.ordering,
                createdAt = it.createdAt,
                createdAtHk = it.createdAtHk,
                parentWorkspaceId = this.id
            )
        }
    )
}

data class CreateWorkspaceRequest(
    val name: String
)


data class ReorderWorkspacesRequest(
    val fromIndex: Int,
    val toIndex: Int
)

data class ReorderWorkspaceFoldersRequest(
    val fromIndex: Int,
    val toIndex: Int
)


fun Workspace.toResponse(): WorkspaceResponse {
    return WorkspaceResponse(
        id = this.id,
        name = this.name.value,
        ordering = this.ordering,
        folders = this.folders.sortedBy { it.ordering }.map { it.toResponse() },
        createdAt = this.createdAt,
        createdAtHk = this.createdAtHk
    )
}

data class WorkspaceResponse(
    val id: Int?,
    val name: String,
    val ordering: Int,
    val folders: List<ScriptsFolderResponse>,
    val createdAt: Double?,
    val createdAtHk: String?
)

data class HistoricalShellScriptResponse(
    val parentFolderPath: String,
    val history: HistoricalShellScriptDTO,
    val shellScript: ShellScriptDTO
)

data class CreateAIProfileRequest(
    val name: String,
    val description: String
)

data class CreateModelConfigRequest(
    val name: String,
    val modelSource: ModelConfig.ModelSourceType,
    val aiprofileId: Int
)

data class CreateAIScripToolRequest(
    val name: String,
    val isEnabled: Boolean,
    val toolDescription: String,
)

data class UpdateAIProfileRequest(
    val aiProfileDTO: AiProfileDTO
)

data class UpdateModelConfigRequest(
    val modelConfigDTO: ModelConfigDTO,
    val openAiModelConfigDTO: OpenAiModelConfigDTO? = null,
    val azureModelConfigDTO: AzureModelConfigDTO? = null
)

typealias ModelConfigResponse = UpdateModelConfigRequest

data class UpdateAIScriptedToolRequest(
    val aiScriptedToolDTO: AiScriptedToolDTO
)

data class SelectDefaultModelConfigRequest(
    val aiProfileId: Int,
    val modelConfigId: Int
)

