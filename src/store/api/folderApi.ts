import { ScriptsFolderDTO, ScriptsFolderResponse } from "@/types/dto";
import { baseApi } from "./baseApi";

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
        getAllFolders: builder.query<ScriptsFolderDTO[], void>({
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
        createFolder: builder.mutation<Folder, CreateFolderRequest>({
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
            invalidatesTags: ["FolderContent", "Folder"],
        }),

        updateFolder: builder.mutation<void, ScriptsFolderDTO>({
            query: (args) => ({
                url: `/folders/${args.id}`,
                method: "PUT",
                body: args,
            }),
            invalidatesTags: ["Folder", "FolderContent"],
        }),

        reorderFolders: builder.mutation<
            void,
            { parentFolderId?: number; fromIndex: number; toIndex: number; rootFolderId?: number }
        >({
            query: ({ parentFolderId, fromIndex, toIndex }) => ({
                url: "/folders/reorder",
                method: "PATCH",
                body: { parentFolderId, fromIndex, toIndex },
            }),
            onQueryStarted: async (
                { parentFolderId, fromIndex, toIndex, rootFolderId },
                { dispatch, queryFulfilled }
            ) => {
                let action: { undo: () => void } | undefined = undefined;
                if (!parentFolderId) {
                    // Reordering root-level folders
                    action = dispatch(
                        folderApi.util.updateQueryData("getAllFolders", undefined, (draft) => {
                            const [movedItem] = draft.splice(fromIndex, 1);
                            draft.splice(toIndex, 0, movedItem);
                        })
                    );
                } else if (rootFolderId) {
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
                } else {
                    // No rootFolderId provided, just wait for backend and invalidate
                }
                try {
                    await queryFulfilled;
                } catch {
                    if (action) {
                        action.undo();
                    }
                }
            },
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
