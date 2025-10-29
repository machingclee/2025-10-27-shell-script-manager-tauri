import { setSelectedFolderId } from '../slices/folderSlice';
import { baseApi } from './baseApi';

export interface AppState {
  id: number;
  lastOpenedFolderId: number | null;
}

export const appStateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppState: builder.query<AppState | null, void>({
      query: () => ({
        command: 'get_app_state',
        args: {},
      }),
      providesTags: ['AppState'],
      onQueryStarted: async (_, { queryFulfilled,dispatch }) => {
        const { data } = await queryFulfilled;
        if (data?.lastOpenedFolderId) {
          dispatch(setSelectedFolderId(data.lastOpenedFolderId));
        }
      },
    }),

    setLastOpenedFolder: builder.mutation<AppState, number>({
      query: (folderId) => ({
        command: 'set_last_opened_folder',
        args: { folderId }
      }),
      invalidatesTags: ['AppState'],
    }),
  }),
});

