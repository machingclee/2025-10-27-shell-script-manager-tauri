import { AppStateDTO } from "@/types/dto";
import { setSelectedFolderId } from "../slices/folderSlice";
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

                console.log("[appStateApi] getAppState data:", data);

                if (data) {
                    dispatch(baseApi.util.invalidateTags(["ScriptHistory"]));
                }

                // Apply last opened folder
                if (data?.lastOpenedFolderId) {
                    dispatch(setSelectedFolderId(data.lastOpenedFolderId));
                }

                // Apply dark mode on app startup
                if (data?.darkMode !== undefined) {
                    try {
                        if (data.darkMode) {
                            document.documentElement.classList.add("dark");
                            await invoke("set_title_bar_color", { isDark: true });
                        } else {
                            document.documentElement.classList.remove("dark");
                            await invoke("set_title_bar_color", { isDark: false });
                        }
                        console.log("[appStateApi] Applied dark mode:", data.darkMode);
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

                // Apply dark mode change immediately if it's being updated
                if (updates.darkMode !== undefined) {
                    try {
                        if (updates.darkMode) {
                            document.documentElement.classList.add("dark");
                            await invoke("set_title_bar_color", { isDark: true });
                        } else {
                            document.documentElement.classList.remove("dark");
                            await invoke("set_title_bar_color", { isDark: false });
                        }
                        console.log("[appStateApi] Applied dark mode update:", updates.darkMode);
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
