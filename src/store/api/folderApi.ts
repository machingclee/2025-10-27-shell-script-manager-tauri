import { ScriptsFolderDTO, ScriptsFolderResponse } from "@/types/dto";
import { baseApi } from "./baseApi";
import { workspaceApi } from "./workspaceApi";
import folderSlice from "../slices/folderSlice";
import type { RootState } from "../store";

export interface Folder {
    id: number;
    name: string;
    ordering: number;
}

export interface CreateFolderRequest {
    name: string;
}

const getFolderRecursive = (
    folderResponse: ScriptsFolderResponse,
    folderId: number
): ScriptsFolderResponse | null => {
    if (folderResponse.id === folderId) {
        return folderResponse;
    }

    // Then search in subfolders
    for (const subfolder of folderResponse.subfolders) {
        const result = getFolderRecursive(subfolder, folderId);
        if (result) {
            return result;
        }
    }

    return null;
};

// Response structure from Spring Boot

export const folderApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllFolders: builder.query<ScriptsFolderResponse[], void>({
            query: () => ({
                url: "/folders",
                method: "GET",
            }),

            providesTags: ["Folder"],
        }),
        getFolderById: builder.query<ScriptsFolderResponse, number>({
            query: (id) => ({
                url: `/folders/${id}`,
                method: "GET",
            }),
            providesTags: (_, __, id) => [{ type: "FolderContent", id: id }],
        }),
        createRootFolder: builder.mutation<Folder, CreateFolderRequest>({
            query: (request) => ({
                url: "/folders",
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["Folder"],
        }),
        deleteFolder: builder.mutation<void, number>({
            query: (id) => ({
                url: `/folders/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: [
                "FolderContent",
                "Folder",
                "Workspace",
                "WorkspaceDetail",
                "ScriptHistory",
            ],
            onQueryStarted: async (id, { dispatch, queryFulfilled, getState }) => {
                try {
                    await queryFulfilled;
                    const state = getState() as RootState;
                    const selectedRootFolderId = state.folder.selectedRootFolderId || 0;
                    const allFolders = folderApi.endpoints.getAllFolders.select()(state);
                    const allWorkspaces = workspaceApi.endpoints.getAllWorkspaces.select()(state);
                    // get the workspace of selected folder

                    let remainingFolderIdToSelect: number | undefined = undefined;

                    const workspace = allWorkspaces.data?.find((w) =>
                        w.folders.some((f) => f.id === id)
                    );
                    const remainingFolderIdsInWorkspace = workspace?.folders.filter(
                        (f) => f.id !== id
                    );
                    const firstIdInThisWorkspace = remainingFolderIdsInWorkspace?.[0]?.id;

                    if (id !== selectedRootFolderId) {
                        // keep being selected
                        return;
                    }

                    if (firstIdInThisWorkspace != null) {
                        remainingFolderIdToSelect = firstIdInThisWorkspace;
                    } else {
                        const folder = allWorkspaces.data
                            ?.flatMap((w) => w.folders)
                            .sort((a, b) => a.ordering - b.ordering)
                            .find((f) => f.id !== id);
                        if (folder?.id != null) {
                            remainingFolderIdToSelect = folder?.id;
                        } else {
                            const remainingRootFolderId = allFolders.data?.[0]?.id;
                            if (remainingRootFolderId != null) {
                                remainingFolderIdToSelect = remainingRootFolderId;
                            }
                        }
                    }

                    if (remainingFolderIdToSelect != null) {
                        dispatch(
                            folderSlice.actions.setSelectedFolderId(remainingFolderIdToSelect)
                        );
                    }
                } catch {}
            },
        }),

        updateFolder: builder.mutation<void, ScriptsFolderDTO>({
            query: (args) => ({
                url: `/folders/${args.id}`,
                method: "PUT",
                body: args,
            }),
            invalidatesTags: ["Folder", "FolderContent", "Workspace", "ScriptHistory"],
        }),

        reorderFolders: builder.mutation<
            void,
            {
                parentWorkspaceId?: number;
                parentFolderId?: number;
                fromIndex: number;
                toIndex: number;
                rootFolderId?: number;
            }
        >({
            query: ({ parentWorkspaceId, parentFolderId, fromIndex, toIndex }) => ({
                url: "/folders/reorder",
                method: "PATCH",
                body: { parentWorkspaceId, parentFolderId, fromIndex, toIndex },
            }),
            onQueryStarted: async (
                {
                    parentWorkspaceId: parentWorkspaceId,
                    parentFolderId,
                    fromIndex,
                    toIndex,
                    rootFolderId,
                },
                { dispatch, queryFulfilled }
            ) => {
                let action: { undo: () => void } | undefined = undefined;
                if (parentWorkspaceId != null) {
                    // Reordering subfolders within a workspace
                    action = dispatch(
                        workspaceApi.util.updateQueryData(
                            "getAllWorkspaces",
                            undefined,
                            (draft) => {
                                const workspace = draft.find((w) => w.id === parentWorkspaceId);
                                if (!workspace) {
                                    return;
                                }
                                const [movedItem] = workspace.folders.splice(fromIndex, 1);
                                workspace.folders.splice(toIndex, 0, movedItem);
                                // Update ordering
                                workspace.folders.forEach((folder, index) => {
                                    folder.ordering = index;
                                });
                                return draft;
                            }
                        )
                    );
                } else if (!parentFolderId) {
                    // Reordering root-level folders
                    action = dispatch(
                        folderApi.util.updateQueryData("getAllFolders", undefined, (draft) => {
                            const [movedItem] = draft.splice(fromIndex, 1);
                            draft.splice(toIndex, 0, movedItem);
                        })
                    );
                } else if (rootFolderId && parentFolderId != null) {
                    // Reordering subfolders within a parent folder
                    action = dispatch(
                        folderApi.util.updateQueryData("getFolderById", rootFolderId, (draft) => {
                            const parentFolder = getFolderRecursive(draft, parentFolderId);
                            if (!parentFolder) {
                                return;
                            }
                            const [movedItem] = parentFolder.subfolders.splice(fromIndex, 1);
                            parentFolder.subfolders.splice(toIndex, 0, movedItem);
                        })
                    );
                }
                try {
                    await queryFulfilled;
                } catch {
                    if (action) {
                        action.undo();
                    }
                }
            },

            invalidatesTags: ["Folder", "Workspace", "ScriptHistory"],
            // Removed invalidatesTags - optimistic update handles the UI update
        }),

        createSubfolder: builder.mutation<void, { parentFolderId: number; name: string }>({
            query: ({ parentFolderId, name }) => ({
                url: `/folders/${parentFolderId}/subfolders`,
                method: "POST",
                body: { name },
            }),
            invalidatesTags: ["FolderContent"],
        }),
    }),
});
