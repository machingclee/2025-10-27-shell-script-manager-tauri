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
            invalidatesTags: ["Folder"],
        }),

        reorderFolders: builder.mutation<
            void,
            { parentFolderId?: number; fromIndex: number; toIndex: number }
        >({
            query: ({ parentFolderId, fromIndex, toIndex }) => ({
                url: "/folders/reorder",
                method: "PATCH",
                body: { parentFolderId, fromIndex, toIndex },
            }),
            invalidatesTags: ["Folder", "FolderContent"],
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
