import { configureStore } from '@reduxjs/toolkit';
import folderSlice from './slices/folderSlice';
import configSlice from './slices/configSlice';
import { baseApi } from './api/baseApi';

export const store = configureStore({
  reducer: {
    folder: folderSlice.reducer,
    config: configSlice.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

