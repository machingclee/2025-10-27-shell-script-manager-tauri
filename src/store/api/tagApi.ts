import type { RootState } from "../store";
import { baseApi } from "./baseApi";

export type TagDTO = {
    id: number;
    name: string;
    tagFolderId: number | null;
};

export type TagFolderDTO = {
    id: number;
    name: string;
    ordering: number;
};

export type CreateTagRequest = {
    name: string;
    tagFolderId: number | null;
};

export const tagApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllTags: builder.query<TagDTO[], void>({
            query: () => ({ url: "/tags", method: "GET" }),
            providesTags: ["Tag"],
        }),
        createTag: builder.mutation<TagDTO, CreateTagRequest>({
            query: (body) => ({ url: "/tags", method: "POST", body }),
            invalidatesTags: ["Tag"],
        }),
        updateTag: builder.mutation<TagDTO, TagDTO>({
            query: (tag) => ({ url: `/tags/${tag.id}`, method: "PUT", body: tag }),
            // FolderContent feeds the middle-column script list (and drafts).
            // SearchResults feeds the right-column search panel. Both embed tag names.
            invalidatesTags: ["Tag", "FolderContent", "SearchResults", "ScriptHistory"],
        }),
        deleteTag: builder.mutation<void, number>({
            query: (id) => ({ url: `/tags/${id}`, method: "DELETE" }),
            invalidatesTags: ["Tag", "FolderContent", "SearchResults", "ScriptHistory"],
        }),
        getAllTagFolders: builder.query<TagFolderDTO[], void>({
            query: () => ({ url: "/tag-folders", method: "GET" }),
            providesTags: ["TagFolder"],
        }),
        createTagFolder: builder.mutation<TagFolderDTO, { name: string }>({
            query: (body) => ({ url: "/tag-folders", method: "POST", body }),
            invalidatesTags: ["TagFolder"],
        }),
        updateTagFolder: builder.mutation<TagFolderDTO, TagFolderDTO>({
            query: (folder) => ({
                url: `/tag-folders/${folder.id}`,
                method: "PUT",
                body: folder,
            }),
            invalidatesTags: ["TagFolder"],
        }),
        deleteTagFolder: builder.mutation<void, number>({
            query: (id) => ({ url: `/tag-folders/${id}`, method: "DELETE" }),
            invalidatesTags: ["TagFolder", "Tag"],
        }),
        reorderTagFolders: builder.mutation<void, { fromIndex: number; toIndex: number }>({
            query: (body) => ({ url: "/tag-folders/reorder", method: "PATCH", body }),
            onQueryStarted: async ({ fromIndex, toIndex }, { dispatch, getState, queryFulfilled }) => {
                const cachedArgs = tagApi.util.selectCachedArgsForQuery(
                    getState() as RootState,
                    "getAllTagFolders"
                );
                const queryArgs = cachedArgs.length > 0 ? cachedArgs : [undefined];
                const patches = queryArgs.map((queryArg) =>
                    dispatch(
                        tagApi.util.updateQueryData("getAllTagFolders", queryArg, (draft) => {
                            if (fromIndex < 0 || fromIndex >= draft.length || toIndex < 0 || toIndex >= draft.length) {
                                return;
                            }
                            const [moved] = draft.splice(fromIndex, 1);
                            if (!moved) return;
                            draft.splice(toIndex, 0, moved);
                            draft.forEach((folder, index) => {
                                folder.ordering = index;
                            });
                        })
                    )
                );
                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((patch) => patch.undo());
                }
            },
        }),
    }),
});
