import { baseApi } from './baseApi';

export interface Script {
  id: number;
  name: string;
  command: string;
  execution_count: number;
}

export interface CreateScriptRequest {
  name: string;
  content: string;
  folder_id: number;
}

export interface UpdateScriptRequest {
  id: number;
  name?: string;
  content?: string;
}

export const scriptApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScriptsByFolder: builder.query<Script[], number>({
      query: (folderId) => ({
        command: 'get_scripts_by_folder',
        args: { folder_id: folderId },
      }),
      providesTags: (_result, _error, folderId) => [
        { type: 'Script', id: `FOLDER-${folderId}` },
      ],
    }),

    createScript: builder.mutation<Script, CreateScriptRequest>({
      query: (request) => ({
        command: 'create_script',
        args: request,
      }),
      invalidatesTags: ['Script'],
    }),

    updateScript: builder.mutation<Script, UpdateScriptRequest>({
      query: (request) => ({
        command: 'update_script',
        args: request,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Script', id }, 'Script'],
    }),

    deleteScript: builder.mutation<void, number>({
      query: (id) => ({
        command: 'delete_script',
        args: { id },
      }),
      invalidatesTags: ['Script'],
    }),
  }),
});

