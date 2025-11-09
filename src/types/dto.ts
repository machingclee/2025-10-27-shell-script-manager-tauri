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
    ordering: number;
    showShell: boolean;
    createdAt?: number;
    createdAtHk?: string;
};

export type ScriptsFolderResponse = {
    id: number;
    name: string;
    ordering: number;
    createdAt?: number;
    createdAtHk?: string;
    shellScripts: ShellScriptResponse[];
    parentFolder?: ScriptsFolderDTO | null;
    subfolders: ScriptsFolderResponse[];
};

export type ShellScriptResponse = {
    id: number;
    name: string;
    command: string;
    ordering: number;
    showShell: boolean;
    createdAt: number;
    createdAtHk: string;
    parentFolderId: number;
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
