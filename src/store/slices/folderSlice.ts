import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FolderState {
    selectedRootFolderId: number | null;
    isReorderingFolder: boolean;
    scripts: {
        executing: { [scriptId: number]: { loading: boolean } };
    };
}

const initialState: FolderState = {
    selectedRootFolderId: null,
    isReorderingFolder: false,
    scripts: {
        executing: {},
    },
};

export const folderSlice = createSlice({
    name: "folder",
    initialState,
    reducers: {
        setExecutingScript: (
            state,
            action: PayloadAction<{ script_id: number; loading: boolean }>
        ) => {
            state.scripts.executing[action.payload.script_id] = { loading: action.payload.loading };
        },
        setSelectedFolderId: (state, action: PayloadAction<number>) => {
            state.selectedRootFolderId = action.payload;
        },
        clearSelectedFolderId: (state) => {
            state.selectedRootFolderId = null;
        },
        setIsReorderingFolder: (state, action: PayloadAction<boolean>) => {
            state.isReorderingFolder = action.payload;
        },
    },
});

export const { setSelectedFolderId, clearSelectedFolderId, setIsReorderingFolder } =
    folderSlice.actions;

export default folderSlice;
