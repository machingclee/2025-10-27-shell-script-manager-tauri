import { createSlice } from "@reduxjs/toolkit";

interface HistoryState {
    isOpen: boolean;
}

const initialState: HistoryState = {
    isOpen: true,
};

const historySlice = createSlice({
    name: "history",
    initialState,
    reducers: {
        openHistory: (state) => {
            state.isOpen = true;
        },
        closeHistory: (state) => {
            state.isOpen = false;
        },
        toggleHistory: (state) => {
            state.isOpen = !state.isOpen;
        },
    },
});

export const { openHistory, closeHistory, toggleHistory } = historySlice.actions;
export default historySlice;

