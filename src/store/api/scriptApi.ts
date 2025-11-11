import {
    CreateScriptRequest,
    ScriptsFolderResponse,
    ShellScriptDTO,
    ShellScriptResponse,
} from "@/types/dto";
import { baseApi } from "./baseApi";
import { folderApi } from "./folderApi";

const getSubfolder = (
    folderResponse: ScriptsFolderResponse,
    folderId: number
): ScriptsFolderResponse | null => {
    // First check if the current folder is the target
    if (folderResponse.id === folderId) {
        return folderResponse;
    }

    // Then search in subfolders
    const targetFolder = folderResponse.subfolders.find((subfolder) => subfolder.id === folderId);
    if (targetFolder) {
        return targetFolder;
    }

    // Recursively search in nested subfolders
    for (const subfolder of folderResponse.subfolders) {
        const result = getSubfolder(subfolder, folderId);
        if (result) {
            return result;
        }
    }
    return null;
};

export const scriptApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createScript: builder.mutation<ShellScriptResponse, CreateScriptRequest>({
            query: (request) => ({
                url: "/scripts",
                method: "POST",
                body: request,
            }),
            async onQueryStarted(request, { dispatch, queryFulfilled }) {
                try {
                    const { data: newScript } = await queryFulfilled;
                    // Optimistically add the new script to the cache
                    dispatch(
                        folderApi.util.updateQueryData(
                            "getFolderById",
                            request.folderId,
                            (draft) => {
                                const subfolder = getSubfolder(draft, request.folderId);
                                if (subfolder) {
                                    subfolder.shellScripts.push(newScript);
                                }
                            }
                        )
                    );
                } catch {
                    // Error handling - the mutation will fail and show an error
                }
            },
        }),
        moveScriptIntoFolder: builder.mutation<
            ShellScriptDTO,
            { scriptId: number; folderId: number; rootFolderId: number }
        >({
            query: ({ scriptId, folderId }) => ({
                url: `/scripts/${scriptId}/folder/${folderId}/move`,
                method: "PUT",
            }),
            onQueryStarted: async (
                { scriptId, folderId, rootFolderId },
                { dispatch, queryFulfilled }
            ) => {
                const patchResult = dispatch(
                    folderApi.util.updateQueryData("getFolderById", rootFolderId, (draft) => {
                        // Helper to find script recursively
                        const findAndRemoveScript = (
                            folder: ScriptsFolderResponse
                        ): ShellScriptResponse | null => {
                            const scriptIndex = folder.shellScripts.findIndex(
                                (s) => s.id === scriptId
                            );
                            if (scriptIndex !== -1) {
                                const [removed] = folder.shellScripts.splice(scriptIndex, 1);
                                return removed;
                            }
                            for (const subfolder of folder.subfolders) {
                                const found = findAndRemoveScript(subfolder);
                                if (found) return found;
                            }
                            return null;
                        };

                        // Find and remove script from its current location
                        const script = findAndRemoveScript(draft);
                        if (!script) {
                            return;
                        }

                        // Find destination folder and add script to it
                        const destinationFolder = getSubfolder(draft, folderId);
                        if (!destinationFolder) {
                            return;
                        }

                        // Update script properties and add to destination
                        script.parentFolderId = folderId;
                        script.ordering = 0;
                        destinationFolder.shellScripts.unshift(script);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: [{ type: "FolderContent" }],
            // Removed invalidatesTags - optimistic update handles the UI update
        }),
        updateScript: builder.mutation<ShellScriptDTO, ShellScriptDTO>({
            query: (request) => ({
                url: `/scripts/${request.id}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: "Script", id },
                "Script",
                { type: "FolderContent" },
            ],
        }),

        deleteScript: builder.mutation<void, { id: number; folderId: number }>({
            query: ({ id, folderId }) => ({
                url: `/scripts/${id}?folderId=${folderId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Script", { type: "FolderContent" }],
            async onQueryStarted({ id, folderId }, { dispatch, queryFulfilled }) {
                // Optimistically update the cache
                const patchResult = dispatch(
                    folderApi.util.updateQueryData("getFolderById", folderId, (draft) => {
                        const folder = getSubfolder(draft, folderId);
                        if (!folder) {
                            return;
                        }
                        const index = folder.shellScripts.findIndex((s) => s.id === id);
                        if (index !== -1) {
                            folder.shellScripts.splice(index, 1);
                        }
                    })
                );

                try {
                    await queryFulfilled;
                } catch {
                    // Rollback on error
                    patchResult.undo();
                }
            },
        }),

        reorderScripts: builder.mutation<
            void,
            { folderId: number; fromIndex: number; toIndex: number; rootFolderId?: number }
        >({
            query: ({ folderId, fromIndex, toIndex }) => ({
                url: "/scripts/reorder",
                method: "POST",
                body: { folderId, fromIndex, toIndex },
            }),
            async onQueryStarted(
                { folderId, fromIndex, toIndex, rootFolderId: rootFolderId },
                { dispatch, queryFulfilled }
            ) {
                console.log("rootFolderId", rootFolderId);
                const action = dispatch(
                    folderApi.util.updateQueryData("getFolderById", rootFolderId || 0, (draft) => {
                        const folder = getSubfolder(draft, folderId);
                        if (!folder) {
                            return;
                        }
                        const [movedItem] = folder.shellScripts.splice(fromIndex, 1);
                        folder.shellScripts.splice(toIndex, 0, movedItem);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    action.undo();
                }
            },
            // Removed invalidatesTags - optimistic update handles the UI update
        }),
    }),
});
