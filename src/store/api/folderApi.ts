import { baseApi } from './baseApi';

export interface Folder {
  id: number;
  name: string;
  ordering: number;
}

export interface CreateFolderRequest {
  name: string;
}

export const folderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllFolders: builder.query<Folder[], void>({
      query: () => ({
        command: 'get_all_folders',
        args: {},
      }),
      providesTags: ['Folder'],
    }),

    createFolder: builder.mutation<Folder, CreateFolderRequest>({
      query: (request) => ({
        command: 'create_folder',
        args: request,
      }),
      async onQueryStarted(_request, { dispatch, queryFulfilled }) {
        try {
          const { data: newFolder } = await queryFulfilled;
          // Optimistically add the new folder to the cache
          dispatch(
            folderApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
              draft.push(newFolder);
            })
          );
        } catch {
          // Error handling - the mutation will fail and show an error
        }
      },
    }),

    deleteFolder: builder.mutation<void, number>({
      query: (id) => ({
        command: 'delete_folder',
        args: { id },
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          folderApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
            const index = draft.findIndex(f => f.id === id);
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

    renameFolder: builder.mutation<void, { id: number; newName: string }>({
      query: ({ id, newName }) => ({
        command: 'rename_folder',
        args: { id, newName },
      }),
      async onQueryStarted({ id, newName }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          folderApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
            const folder = draft.find(f => f.id === id);
            if (folder) {
              folder.name = newName;
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

    reorderFolders: builder.mutation<void, { fromIndex: number; toIndex: number }>({
      query: ({ fromIndex, toIndex }) => ({
        command: 'reorder_folders',
        args: { fromIndex, toIndex },
      }),
      async onQueryStarted({ fromIndex, toIndex }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          folderApi.util.updateQueryData('getAllFolders', undefined, (draft) => {
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
  }),
});

