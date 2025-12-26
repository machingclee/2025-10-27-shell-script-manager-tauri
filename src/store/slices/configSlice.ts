import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConfigState {
    backendPort: number;
    pythonPort: number;
}

const initialState: ConfigState = {
    // In development, always use 7070. In production, wait for fetched port.
    backendPort: import.meta.env.DEV ? 7070 : 0,
    pythonPort: import.meta.env.DEV ? 8000 : 0,
};

export const configSlice = createSlice({
    name: "config",
    initialState,
    reducers: {
        setBackendPort: (state, action: PayloadAction<number>) => {
            state.backendPort = action.payload;
        },
        setPythonPort: (state, action: PayloadAction<number>) => {
            state.pythonPort = action.payload;
        },
    },
});

export const { setBackendPort, setPythonPort } = configSlice.actions;

export default configSlice;
