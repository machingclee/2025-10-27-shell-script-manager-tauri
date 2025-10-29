import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FolderState {
  selectedFolderId: number | null;
  isReorderingFolder: boolean;
}

const initialState: FolderState = {
  selectedFolderId: null,
  isReorderingFolder: false,
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
    setIsReorderingFolder: (state, action: PayloadAction<boolean>) => {
      state.isReorderingFolder = action.payload;
    },
  },
});

export const { setSelectedFolderId, clearSelectedFolderId, setIsReorderingFolder } = folderSlice.actions;

export default folderSlice;
