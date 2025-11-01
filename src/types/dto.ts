export type ScriptsFolderDTO = {
    id: number;
    name: string;
    ordering: number;
    createdAt: number;
    createdAtHk: string;
}


export type AppStateDTO = {
    id: number;
    lastOpenedFolderId: number;
    darkMode: boolean;
    createdAt: number;
    createdAtHk: string;
};
