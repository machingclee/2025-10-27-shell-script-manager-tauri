import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RootFolderState {
    selectedRootFolderId: number | null;
    isReorderingFolder: boolean;
    scripts: {
        executing: { [scriptId: number]: { loading: boolean } };
    };
}

const initialState: RootFolderState = {
    selectedRootFolderId: null,
    isReorderingFolder: false,
    scripts: {
        executing: {},
    },
};

export const rootFolderSlice = createSlice({
    name: "folder",
    initialState,
    reducers: {
        setExecutingScript: (
            state,
            action: PayloadAction<{ script_id: number; loading: boolean }>
        ) => {
            state.scripts.executing[action.payload.script_id] = { loading: action.payload.loading };
        },
        setSelectedRootFolderId: (state, action: PayloadAction<number>) => {
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

export const {
    setSelectedRootFolderId: setSelectedFolderId,
    clearSelectedFolderId,
    setIsReorderingFolder,
} = rootFolderSlice.actions;

export default rootFolderSlice;
