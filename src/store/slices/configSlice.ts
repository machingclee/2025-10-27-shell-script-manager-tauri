import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ConfigState {
  backendPort: number;
}

const initialState: ConfigState = {
  // In development, always use 7070. In production, wait for fetched port.
  backendPort: import.meta.env.DEV ? 7070 : 0,
};

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setBackendPort: (state, action: PayloadAction<number>) => {
      state.backendPort = action.payload;
    },
  },
});

export const { setBackendPort } = configSlice.actions;

export default configSlice;

