import { configureStore } from "@reduxjs/toolkit";
import rootFolderSlice from "./slices/rootFolderSlice";
import configSlice from "./slices/configSlice";
import historySlice from "./slices/historySlice";
import aiSlice from "./slices/aiSlice";
import appSlice from "./slices/appSlice";
import { baseApi } from "./api/baseApi";

declare global {
    interface Window {
        __store__?: typeof store;
    }
}

export const store = configureStore({
    reducer: {
        folder: rootFolderSlice.reducer,
        config: configSlice.reducer,
        history: historySlice.reducer,
        ai: aiSlice.reducer,
        app: appSlice.reducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

if (import.meta.env.DEV) {
    window.__store__ = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
