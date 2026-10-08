import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConfigState {
    backendPort: number;
    /** Live result of the continuous /health probe. False until the first success. */
    backendHealthy: boolean;
}

const initialState: ConfigState = {
    // In development, always use 7070. In production, wait for fetched port.
    backendPort: import.meta.env.DEV ? 7070 : 0,
    backendHealthy: false,
};

export const configSlice = createSlice({
    name: "config",
    initialState,
    reducers: {
        setBackendPort: (state, action: PayloadAction<number>) => {
            state.backendPort = action.payload;
        },
        setBackendHealthy: (state, action: PayloadAction<boolean>) => {
            state.backendHealthy = action.payload;
        },
    },
});

export const { setBackendPort, setBackendHealthy } = configSlice.actions;

export default configSlice;
