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
      invalidatesTags: ['Folder'],
    }),

    deleteFolder: builder.mutation<void, number>({
      query: (id) => ({
        command: 'delete_folder',
        args: { id },
      }),
      invalidatesTags: ['Folder'],
    }),
  }),
});

