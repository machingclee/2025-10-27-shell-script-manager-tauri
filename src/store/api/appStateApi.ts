import { setSelectedFolderId } from '../slices/folderSlice';
import { baseApi } from './baseApi';

export interface AppState {
  id: number;
  last_opened_folder_id: number | null;
  dark_mode: boolean;
}

export const appStateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppState: builder.query<AppState | null, void>({
      query: () => ({
        command: 'get_app_state',
        args: {},
      }),
      keepUnusedDataFor: 0,
      providesTags: ['AppState'],
      onQueryStarted: async (_, { queryFulfilled, dispatch }) => {
        const { data } = await queryFulfilled;
        console.log('[appStateApi] getAppState data:', data);
        if (data?.last_opened_folder_id) {
          dispatch(setSelectedFolderId(data.last_opened_folder_id));
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

    getDarkMode: builder.query<boolean, void>({
      query: () => ({
        command: 'get_dark_mode',
        args: {},
      }),
      providesTags: ['DarkMode'],
    }),

    setDarkMode: builder.mutation<boolean, boolean>({
      query: (enabled) => ({
        command: 'set_dark_mode',
        args: { enabled }
      }),
      invalidatesTags: ['DarkMode', 'AppState'],
    }),
  }),
});

