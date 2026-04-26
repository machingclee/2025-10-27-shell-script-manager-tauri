import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const HOME_TAB_ID = -1;

export type AppTab =
    | { scriptId: typeof HOME_TAB_ID; type: "home" }
    | { scriptId: number; type: "markdown"; scriptName: string };

export interface MarkdownTabState {
    isEditMode: boolean;
    editViewMode: "plain" | "mixed" | "preview";
    /** Only meaningful when hasChanges is true; otherwise script.command is the source of truth. */
    editContent: string;
    editName: string;
    hasChanges: boolean;
    /** True for ~2 s after a successful save (to show "Saved" in the toolbar). */
    edited: boolean;
    splitRatio: number;
    editorScrollTop: number;
    previewScrollTop: number;
}

interface TabState {
    tabs: AppTab[];
    activeTabId: number;
    tabStates: Record<number, MarkdownTabState>;
    /** Shared across all tabs — zoom in/out affects every open tab. */
    fontSize: number;
    /** Shared across all tabs — dark/light preview mode toggle. */
    previewDarkMode: boolean;
}

interface AppState {
    tab: TabState;
}

export const DEFAULT_FONT_SIZE = 18;

const initialState: AppState = {
    tab: {
        tabs: [{ scriptId: HOME_TAB_ID, type: "home" }],
        activeTabId: HOME_TAB_ID,
        tabStates: {},
        fontSize: DEFAULT_FONT_SIZE,
        previewDarkMode: true,
    },
};

const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        openMarkdownTab(state, action: PayloadAction<{ scriptId: number; scriptName: string }>) {
            const { scriptId, scriptName } = action.payload;
            const exists = state.tab.tabs.find((t) => t.scriptId === scriptId);
            if (exists) {
                state.tab.activeTabId = scriptId;
                return;
            }
            state.tab.tabs.push({ scriptId, type: "markdown", scriptName });
            state.tab.activeTabId = scriptId;
        },
        closeTab(state, action: PayloadAction<number>) {
            const tabId = action.payload;
            const idx = state.tab.tabs.findIndex((t) => t.scriptId === tabId);
            if (idx === -1) return;
            state.tab.tabs.splice(idx, 1);
            if (state.tab.activeTabId === tabId) {
                state.tab.activeTabId =
                    state.tab.tabs[idx - 1]?.scriptId ?? state.tab.tabs[0]?.scriptId ?? HOME_TAB_ID;
            }
            delete state.tab.tabStates[tabId];
        },
        setActiveTab(state, action: PayloadAction<number>) {
            state.tab.activeTabId = action.payload;
        },
        saveTabState(state, action: PayloadAction<{ tabId: number; tabState: MarkdownTabState }>) {
            state.tab.tabStates[action.payload.tabId] = action.payload.tabState;
        },
        patchTabState(state, action: PayloadAction<{ tabId: number } & Partial<MarkdownTabState>>) {
            const { tabId, ...patch } = action.payload;
            const existing = state.tab.tabStates[tabId];
            if (existing) {
                Object.assign(existing, patch);
            } else {
                state.tab.tabStates[tabId] = {
                    isEditMode: false,
                    editViewMode: "preview",
                    editContent: "",
                    editName: "",
                    hasChanges: false,
                    edited: false,
                    splitRatio: 50,
                    editorScrollTop: 0,
                    previewScrollTop: 0,
                    ...patch,
                };
            }
        },
        setFontSize(state, action: PayloadAction<number>) {
            state.tab.fontSize = action.payload;
        },
        setPreviewDarkMode(state, action: PayloadAction<boolean>) {
            state.tab.previewDarkMode = action.payload;
        },
        reorderTabs(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
            const { fromIndex, toIndex } = action.payload;
            if (fromIndex === toIndex) return;
            const [tab] = state.tab.tabs.splice(fromIndex, 1);
            state.tab.tabs.splice(toIndex, 0, tab);
        },
    },
});

export const {
    openMarkdownTab,
    closeTab,
    setActiveTab,
    saveTabState,
    patchTabState,
    setFontSize,
    setPreviewDarkMode,
    reorderTabs,
} = appSlice.actions;
export default appSlice;
