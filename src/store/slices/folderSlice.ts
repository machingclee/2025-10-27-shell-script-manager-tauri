import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  value: number;
  text: string;
}

const initialState: ExampleState = {
  value: 0,
  text: '',
};

export const folderSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
  },
});

export default folderSlice;

