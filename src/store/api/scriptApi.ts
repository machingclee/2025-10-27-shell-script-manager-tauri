import { baseApi } from './baseApi';

export interface Script {
  id: number;
  name: string;
  command: string;
}

export interface CreateScriptRequest {
  name: string;
  content: string;
  folderId: number;
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
        args: { folderId },
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
      async onQueryStarted(request, { dispatch, queryFulfilled }) {
        try {
          const { data: newScript } = await queryFulfilled;
          // Optimistically add the new script to the cache
          dispatch(
            scriptApi.util.updateQueryData('getScriptsByFolder', request.folderId, (draft) => {
              draft.push(newScript);
            })
          );
        } catch {
          // Error handling - the mutation will fail and show an error
        }
      },
    }),

    updateScript: builder.mutation<Script, UpdateScriptRequest>({
      query: (request) => ({
        command: 'update_script',
        args: request,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Script', id }, 'Script'],
    }),

    deleteScript: builder.mutation<void, { id: number; folderId: number }>({
      query: ({ id, folderId }) => ({
        command: 'delete_script',
        args: { id, folderId },
      }),
      async onQueryStarted({ id, folderId }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          scriptApi.util.updateQueryData('getScriptsByFolder', folderId, (draft) => {
            const index = draft.findIndex(s => s.id === id);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          // Rollback on error
          patchResult.undo();
        }
      },
    }),

    reorderScripts: builder.mutation<void, { folderId: number; fromIndex: number; toIndex: number }>({
      query: ({ folderId, fromIndex, toIndex }) => ({
        command: 'reorder_scripts',
        args: { folderId, fromIndex, toIndex },
      }),
      async onQueryStarted({ folderId, fromIndex, toIndex }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          scriptApi.util.updateQueryData('getScriptsByFolder', folderId, (draft) => {
            const [movedItem] = draft.splice(fromIndex, 1);
            draft.splice(toIndex, 0, movedItem);
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          // Rollback on error
          patchResult.undo();
        }
      },
    }),

    runScript: builder.mutation<void, string>({
      query: (command) => ({
        command: 'run_script',
        args: { command },
      }),
    }),
  }),
});

