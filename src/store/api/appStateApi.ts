import { AppStateDTO } from "@/types/dto";
import { setSelectedFolderId } from "../slices/folderSlice";
import { baseApi } from "./baseApi";

export const appStateApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAppState: builder.query<AppStateDTO | null, void>({
            query: () => ({
                url: "/app-state",
                method: "GET",
            }),
            keepUnusedDataFor: 0,
            providesTags: ["AppState"],
            onQueryStarted: async (_, { queryFulfilled, dispatch }) => {
                const { data } = await queryFulfilled;
                console.log("[appStateApi] getAppState data:", data);
                if (data?.lastOpenedFolderId) {
                    dispatch(setSelectedFolderId(data.lastOpenedFolderId));
                }
            },
        }),

        updateAppState: builder.mutation<AppStateDTO, AppStateDTO>({
            query: (updates) => ({
                url: "/app-state",
                method: "PUT",
                body: updates,
            }),
            invalidatesTags: ["AppState"],
            // Optimistic update
            async onQueryStarted(updates, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    appStateApi.util.updateQueryData("getAppState", undefined, (draft) => {
                        if (draft) {
                            Object.assign(draft, updates);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
    }),
});
