import { configureStore } from "@reduxjs/toolkit";
import rootFolderSlice from "./slices/rootFolderSlice";
import configSlice from "./slices/configSlice";
import historySlice from "./slices/historySlice";
import aiSlice from "./slices/aiSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
    reducer: {
        folder: rootFolderSlice.reducer,
        config: configSlice.reducer,
        history: historySlice.reducer,
        ai: aiSlice.reducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
