import { createApi } from '@reduxjs/toolkit/query/react';
import { httpBaseQuery } from './baseQuery/httpBaseQuery';


export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: httpBaseQuery(),
  tagTypes: ['Folder', 'Script', 'User', 'AppState', 'DarkMode'],
  endpoints: (_builder) => ({}),
});

