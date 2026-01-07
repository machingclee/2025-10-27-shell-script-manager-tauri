export enum CollisionType {
    ROOT_FOLDER = "ROOT_FOLDER",
    WORKSPACE_NESTED_FOLDER = "WORKSPACE_NESTED_FOLDER",
    WORKSPACE = "WORKSPACE",
    ROOT_FOLDERS_AREA = "ROOT_FOLDERS_AREA",
}

export type ScriptsFolderDTO = {
    id: number;
    name: string;
    ordering: number;
    createdAt: number;
    createdAtHk: string;
};

export type ShellScriptDTO = {
    id?: number;
    name: string;
    command: string;
    locked: boolean;
    ordering: number;
    showShell: boolean;
    createdAt?: number;
    createdAtHk?: string;
    isMarkdown: boolean;
};

export type ScriptsFolderResponse = {
    id: number;
    name: string;
    ordering: number;
    createdAt?: number;
    createdAtHk?: string;
    shellScripts: ShellScriptResponse[];
    parentFolder: ScriptsFolderDTO | null;
    parentWorkspace: WorkspaceDTO | null;
    subfolders: ScriptsFolderResponse[];
};

export type ShellScriptResponse = {
    id: number;
    name: string;
    command: string;
    ordering: number;
    showShell: boolean;
    locked: boolean;
    createdAt: number;
    createdAtHk: string;
    parentFolderId: number;
    isMarkdown: boolean;
};

export type AppStateDTO = {
    id: number;
    lastOpenedFolderId: number;

    darkMode: boolean;
    createdAt: number;
    createdAtHk: string;
};

export interface CreateScriptRequest {
    name: string;
    content: string;
    folderId: number;
}

export interface UpdateScriptRequest {
    id: number;
    name?: string;
    content?: string;
}

export type WorkspaceDTO = {
    id: number;
    name: string;
    ordering: number;
    createdAt: number;
    createdAtHk: string;
};

export type WorkspaceResponse = {
    id: number;
    name: string;
    ordering: number;
    folders: ScriptsFolderResponse[];
    createdAt: number;
    createdAtHk: string;
};

export type ReorderFoldersRequest = {
    parentWortspaceId?: number;
    parentFolderId?: number;
    fromIndex: number;
    toIndex: number;
    rootFolderId?: number;
};

export type WorkspaceWithFoldersDTO = {
    id: number;
    name: string;
    ordering: number;
    createdAt: number;
    createdAtHk: string;
    folders: ScriptsFolderResponse[];
};

export interface CreateWorkspaceRequest {
    name: string;
}

export interface AddFolderToWorkspaceRequest {
    folderId: number;
}

export interface ReorderWorkspacesRequest {
    fromIndex: number;
    toIndex: number;
}

export interface ReorderWorkspaceFoldersRequest {
    fromIndex: number;
    toIndex: number;
}

export type HistoricalShellScriptDTO = {
    id?: number;
    shellScriptId: number;
    executionTime: number;
    createdAt?: number;
    createdAtHk?: string;
};

export type HistoricalShellScriptResponse = {
    parentFolderPath: string;
    history: HistoricalShellScriptDTO;
    shellScript: ShellScriptDTO;
};

export type AIProfileDTO = {
    id?: number;
    name: string;
    selectedModelConfigId?: number;
    description: string;
    createdAt?: number;
    createdAtHk?: string;
};

export type ModelConfigDTO = {
    id?: number;
    name: string;
    modelSource: "OPENAI" | "AZURE_OPENAI" | "CUSTOM";
    createdAt?: number;
    createdAtHk?: string;
};

export type OpenAiModelConfigDTO = {
    id?: number;
    openaiApiKey: string;
    openaiModel: string;
    createdAt?: number;
    createdAtHk?: string;
    modelConfigId?: number;
};

export type AzureModelConfigDTO = {
    id?: number;
    azureOpenaiApiKey: string;
    azureOpenaiEndpoint: string;
    azureOpenaiApiVersion: string;
    azureOpenaiModel: string;
    createdAt?: number;
    createdAtHk?: string;
    modelConfigId?: number;
};

export type AiScriptedToolDTO = {
    id?: number;
    name: string;
    toolDescription: string;
    isEnabled: boolean;
    shellScriptId: number;
    createdAt?: number;
    createdAtHk?: string;
};
