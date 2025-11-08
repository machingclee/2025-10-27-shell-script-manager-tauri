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
            { scriptId: number; folderId: number }
        >({
            query: ({ scriptId, folderId }) => ({
                url: `/scripts/${scriptId}/folder/${folderId}/move`,
                method: "PUT",
            }),
            invalidatesTags: (_result, _error, { scriptId: _scriptId }) => [
                { type: "FolderContent" },
            ],
        }),
        updateScript: builder.mutation<ShellScriptDTO, ShellScriptDTO>({
            query: (request) => ({
                url: `/scripts/${request.id}`,
                method: "PUT",
                body: request,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: "Script", id }, "Script"],
        }),

        deleteScript: builder.mutation<void, { id: number; folderId: number }>({
            query: ({ id, folderId }) => ({
                url: `/scripts/${id}?folderId=${folderId}`,
                method: "DELETE",
            }),
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
            { folderId: number; fromIndex: number; toIndex: number }
        >({
            query: ({ folderId, fromIndex, toIndex }) => ({
                url: "/scripts/reorder",
                method: "POST",
                body: { folderId, fromIndex, toIndex },
            }),
            async onQueryStarted({ folderId, fromIndex, toIndex }, { dispatch, queryFulfilled }) {
                // Optimistically update the cache

                const patchResult = dispatch(
                    folderApi.util.updateQueryData("getFolderById", folderId, (draft) => {
                        console.log("draft", draft);
                        const folder = getSubfolder(draft, folderId);
                        console.log("folder", folder);
                        if (!folder) {
                            console.log("folder not found");
                            return;
                        }
                        const [movedItem] = folder.shellScripts.splice(fromIndex, 1);
                        folder.shellScripts.splice(toIndex, 0, movedItem);
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
    }),
});
