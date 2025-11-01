import { ScriptsFolderDTO } from '@/types/dto';
import { baseApi } from './baseApi';

export interface Folder {
  id: number;
  name: string;
  ordering: number;
}

export interface CreateFolderRequest {
  name: string;
}

// Response structure from Spring Boot
interface FolderResponse {
  folder: Folder;
  scripts: any[];
}

export const folderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllFolders: builder.query<ScriptsFolderDTO[], void>({
      query: () => ({
        url: '/folders',
        method: 'GET',
      }),

      providesTags: ['Folder'],
    }),

    createFolder: builder.mutation<Folder, CreateFolderRequest>({
      query: (request) => ({
        url: '/folders',
        method: 'POST',
        body: request,
      }),
      invalidatesTags: ['Folder'],
    }),

    deleteFolder: builder.mutation<void, number>({
      query: (id) => ({
        url: `/folders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Folder'],
    }),

    updateFolder: builder.mutation<void, ScriptsFolderDTO>({
      query: (args) => ({
        url: `/folders/${args.id}`,
        method: 'PUT',
        body: args,
      }),
      invalidatesTags: ['Folder'],
    }),

    reorderFolders: builder.mutation<void, { fromIndex: number; toIndex: number }>({
      query: ({ fromIndex, toIndex }) => ({
        url: '/folders/reorder',
        method: 'POST',
        body: { fromIndex, toIndex },
      }),
      invalidatesTags: ['Folder'],
    }),
  }),
});

