import {
    WorkspaceWithFoldersDTO,
    CreateWorkspaceRequest,
    ReorderWorkspacesRequest,
    ReorderWorkspaceFoldersRequest,
    WorkspaceResponse,
    WorkspaceDTO,
    ScriptsFolderResponse,
} from "@/types/dto";
import { baseApi } from "./baseApi";
import folderSlice from "../slices/folderSlice";

export const workspaceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllWorkspaces: builder.query<WorkspaceResponse[], void>({
            query: () => ({
                url: "/workspace",
                method: "GET",
            }),
            providesTags: ["Workspace"],
        }),

        getWorkspaceById: builder.query<WorkspaceWithFoldersDTO, number>({
            query: (id) => ({
                url: `/workspace/${id}`,
                method: "GET",
            }),
            providesTags: (_, __, id) => [{ type: "WorkspaceDetail", id }],
        }),

        createWorkspace: builder.mutation<WorkspaceResponse, CreateWorkspaceRequest>({
            query: (request) => ({
                url: "/workspace",
                method: "POST",
                body: request,
            }),
            invalidatesTags: ["Workspace"],
        }),

        updateWorkspace: builder.mutation<WorkspaceDTO, WorkspaceDTO>({
            query: (workspace) => ({
                url: `/workspace/${workspace.id}`,
                method: "PUT",
                body: workspace,
            }),
            invalidatesTags: ["Workspace", "WorkspaceDetail", "ScriptHistory"],
        }),

        deleteWorkspace: builder.mutation<void, number>({
            query: (id) => ({
                url: `/workspace/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Workspace", "WorkspaceDetail"],
        }),

        moveFolderToWorkspace: builder.mutation<
            WorkspaceWithFoldersDTO,
            { workspaceId: number; folderId: number; fromWorkspaceId?: number }
        >({
            query: ({ workspaceId, folderId }) => ({
                url: `/workspace/${workspaceId}/folders/${folderId}/move`,
                method: "PUT",
            }),
            invalidatesTags: (_, __, { workspaceId }) => [
                { type: "WorkspaceDetail", id: workspaceId },
                "Workspace",
                "Folder",
                "ScriptHistory",
            ],
        }),
        resetFolderParentWorkspace: builder.mutation<WorkspaceWithFoldersDTO, { folderId: number }>(
            {
                query: ({ folderId }) => ({
                    url: `/workspace/folders/${folderId}/reset`,
                    method: "PUT",
                }),
                invalidatesTags: ["Workspace", "Folder", "ScriptHistory"],
            }
        ),

        createWorkspaceFolder: builder.mutation<
            ScriptsFolderResponse,
            { workspaceId: number; name: string }
        >({
            query: ({ workspaceId, name }) => ({
                url: `/workspace/${workspaceId}/folders`,
                method: "POST",
                body: { name },
            }),
            invalidatesTags: ["Workspace", "Folder"],
            onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
                try {
                    const res = await queryFulfilled;
                    if (res.data?.id) {
                        dispatch(folderSlice.actions.setSelectedFolderId(res.data.id));
                    }
                } catch {}
            },
        }),

        reorderWorkspaces: builder.mutation<void, ReorderWorkspacesRequest>({
            query: (request) => ({
                url: "/workspace/reorder",
                method: "PATCH",
                body: request,
            }),
            onQueryStarted: async ({ fromIndex, toIndex }, { dispatch, queryFulfilled }) => {
                // Optimistic update
                const action = dispatch(
                    workspaceApi.util.updateQueryData("getAllWorkspaces", undefined, (draft) => {
                        const [movedItem] = draft.splice(fromIndex, 1);
                        draft.splice(toIndex, 0, movedItem);
                        // Update ordering
                        draft.forEach((workspace, index) => {
                            workspace.ordering = index;
                        });
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    action.undo();
                }
            },
        }),

        reorderWorkspaceFolders: builder.mutation<
            void,
            { workspaceId: number; request: ReorderWorkspaceFoldersRequest }
        >({
            query: ({ workspaceId, request }) => ({
                url: `/workspace/${workspaceId}/folders/reorder`,
                method: "PATCH",
                body: request,
            }),
            onQueryStarted: async (
                { workspaceId, request: { fromIndex, toIndex } },
                { dispatch, queryFulfilled }
            ) => {
                // Optimistic update
                const action = dispatch(
                    workspaceApi.util.updateQueryData("getWorkspaceById", workspaceId, (draft) => {
                        const [movedItem] = draft.folders.splice(fromIndex, 1);
                        draft.folders.splice(toIndex, 0, movedItem);
                        // Update ordering
                        draft.folders.forEach((folder, index) => {
                            folder.ordering = index;
                        });
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    action.undo();
                }
            },
        }),
    }),
});
