import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AiState {
    aiProfile: {
        dialogOpen: boolean;
    };
}

const initialState: AiState = {
    aiProfile: {
        dialogOpen: false,
    },
};

export const aiSlice = createSlice({
    name: "ai",
    initialState,
    reducers: {
        setAiProfileDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.aiProfile.dialogOpen = action.payload;
        },
    },
});

export const { setAiProfileDialogOpen } = aiSlice.actions;

export default aiSlice;
