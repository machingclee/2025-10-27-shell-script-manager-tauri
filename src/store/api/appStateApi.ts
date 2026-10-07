import { AppStateDTO } from "@/types/dto";
import rootFolderSlice from "../slices/rootFolderSlice";
import { baseApi } from "./baseApi";
import { invoke } from "@tauri-apps/api/core";

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

                if (data) {
                    dispatch(baseApi.util.invalidateTags(["ScriptHistory"]));
                }

                // Apply last opened folder
                if (data?.lastOpenedFolderId) {
                    dispatch(
                        rootFolderSlice.actions.setSelectedRootFolderId(data.lastOpenedFolderId)
                    );
                }

                // Apply dark mode on app startup. Only the window chrome is touched
                // here — persisting dark mode is the updateAppState mutation's job.
                if (data?.darkMode !== undefined) {
                    try {
                        if (data.darkMode) {
                            document.documentElement.classList.add("dark");
                        } else {
                            document.documentElement.classList.remove("dark");
                        }
                        await invoke("set_title_bar_color", { isDark: data.darkMode });
                    } catch (error) {
                        console.error("[appStateApi] Failed to apply dark mode:", error);
                    }
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

                // Apply dark mode change immediately if it's being updated.
                // The PUT above already persists it; this only syncs the window chrome.
                if (updates.darkMode !== undefined) {
                    try {
                        if (updates.darkMode) {
                            document.documentElement.classList.add("dark");
                        } else {
                            document.documentElement.classList.remove("dark");
                        }
                        await invoke("set_title_bar_color", { isDark: updates.darkMode });
                    } catch (error) {
                        console.error("[appStateApi] Failed to apply dark mode update:", error);
                    }
                }

                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
    }),
});
