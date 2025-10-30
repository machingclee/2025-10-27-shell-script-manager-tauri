import { createApi } from '@reduxjs/toolkit/query/react';
import { tauriBaseQuery } from './tauriBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: tauriBaseQuery(),
  tagTypes: ['Folder', 'Script', 'User', 'AppState', 'DarkMode'],
  endpoints: (_builder) => ({ }),
});

