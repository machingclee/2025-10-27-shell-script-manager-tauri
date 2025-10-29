import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FolderState {
  selectedFolderId: number | null;
}

const initialState: FolderState = {
  selectedFolderId: null
};

export const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    setSelectedFolderId: (state, action: PayloadAction<number>) => {
      state.selectedFolderId = action.payload;
    },
    clearSelectedFolderId: (state) => {
      state.selectedFolderId = null;
    },
  },
});

export const { setSelectedFolderId, clearSelectedFolderId } = folderSlice.actions;

export default folderSlice;
