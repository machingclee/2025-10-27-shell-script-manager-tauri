import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const HOME_TAB_ID = -1;

export type AppTab =
    | { scriptId: typeof HOME_TAB_ID; type: "home" }
    | { scriptId: number; type: "markdown"; scriptName: string };

// ---------------------------------------------------------------------------
// Common state — read by BOTH the editor and the previewer.
// ---------------------------------------------------------------------------
export interface MarkdownTabState {
    isEditMode: boolean;
    editViewMode: "plain" | "mixed" | "preview";
    editName: string;
    hasChanges: boolean;
    /** True for ~2 s after a successful save (to show "Saved" in the toolbar). */
    edited: boolean;
    splitRatio: number;
    /**
     * Content the previewer renders. Updated via debounce from the editor
     * (so keystrokes do NOT cause the previewer to re-render) and immediately
     * on explicit commits (checkbox toggle, save, etc.).
     */
    previewContent: string;
}

// ---------------------------------------------------------------------------
// Editor-specific state — only the Monaco editor panel subscribes to this.
// Keyed by tabId converted to string.
// ---------------------------------------------------------------------------
export interface EditorTabState {
    /** Live typing content — hot path; only the editor reads this. */
    editContent: string;
    editorScrollTop: number;
}

// ---------------------------------------------------------------------------
// Previewer-specific state — only the preview panel subscribes to this.
// Keyed by tabId converted to string.
// ---------------------------------------------------------------------------
export interface PreviewerTabState {
    previewScrollTop: number;
}

interface TabState {
    tabs: AppTab[];
    activeTabId: number;
    /** Shared state — subscribed to by both editor and previewer. */
    tabStates: Record<number, MarkdownTabState>;
    /** Editor-specific state — subscribed to by the editor panel only. */
    editor: Record<string, EditorTabState>;
    /** Previewer-specific state — subscribed to by the preview panel only. */
    previewer: Record<string, PreviewerTabState>;
    /** Shared across all tabs — zoom in/out affects every open tab. */
    fontSize: number;
    /** Shared across all tabs — dark/light preview mode toggle. */
    previewDarkMode: boolean;
    /** Stack of recently closed markdown tabs; Cmd+Shift+T pops and reopens the last one. */
    closedMarkdownQueue: { scriptId: number; scriptName: string }[];
}

interface AppState {
    tab: TabState;
    rightPanel: {
        mode: "SEARCH" | "HISTORY";
        search: {
            searchText: string;
            searchPage: number;
        };
    };
}

export const DEFAULT_FONT_SIZE = 18;

const initialState: AppState = {
    tab: {
        tabs: [{ scriptId: HOME_TAB_ID, type: "home" }],
        activeTabId: HOME_TAB_ID,
        tabStates: {},
        editor: {},
        previewer: {},
        fontSize: DEFAULT_FONT_SIZE,
        previewDarkMode: true,
        closedMarkdownQueue: [],
    },
    rightPanel: {
        mode: "HISTORY",
        search: {
            searchText: "",
            searchPage: 0,
        },
    },
};

const DEFAULT_EDITOR_STATE: EditorTabState = {
    editContent: "",
    editorScrollTop: 0,
};

const DEFAULT_PREVIEWER_STATE: PreviewerTabState = {
    previewScrollTop: 0,
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
            const closingTab = state.tab.tabs[idx];
            if (closingTab.type === "markdown") {
                state.tab.closedMarkdownQueue.push({
                    scriptId: closingTab.scriptId,
                    scriptName: closingTab.scriptName,
                });
            }
            state.tab.tabs.splice(idx, 1);
            if (state.tab.activeTabId === tabId) {
                state.tab.activeTabId =
                    state.tab.tabs[idx - 1]?.scriptId ?? state.tab.tabs[0]?.scriptId ?? HOME_TAB_ID;
            }
            delete state.tab.tabStates[tabId];
            delete state.tab.editor[String(tabId)];
            delete state.tab.previewer[String(tabId)];
        },
        reopenLastClosedTab(state) {
            const last = state.tab.closedMarkdownQueue.pop();
            if (!last) return;
            const { scriptId, scriptName } = last;
            const exists = state.tab.tabs.find((t) => t.scriptId === scriptId);
            if (exists) {
                state.tab.activeTabId = scriptId;
                return;
            }
            state.tab.tabs.push({ scriptId, type: "markdown", scriptName });
            state.tab.activeTabId = scriptId;
        },
        setActiveTab(state, action: PayloadAction<number>) {
            state.tab.activeTabId = action.payload;
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
                    editName: "",
                    hasChanges: false,
                    edited: false,
                    splitRatio: 50,
                    previewContent: "",
                    ...patch,
                };
            }
        },
        patchEditorState(
            state,
            action: PayloadAction<{ tabId: number } & Partial<EditorTabState>>
        ) {
            const { tabId, ...patch } = action.payload;
            const key = String(tabId);
            const existing = state.tab.editor[key];
            if (existing) {
                Object.assign(existing, patch);
            } else {
                state.tab.editor[key] = { ...DEFAULT_EDITOR_STATE, ...patch };
            }
        },
        patchPreviewerState(
            state,
            action: PayloadAction<{ tabId: number } & Partial<PreviewerTabState>>
        ) {
            const { tabId, ...patch } = action.payload;
            const key = String(tabId);
            const existing = state.tab.previewer[key];
            if (existing) {
                Object.assign(existing, patch);
            } else {
                state.tab.previewer[key] = { ...DEFAULT_PREVIEWER_STATE, ...patch };
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
        setSearchText(state, action: PayloadAction<string>) {
            state.rightPanel.search.searchText = action.payload;
            state.rightPanel.search.searchPage = 0;
        },
        setSearchPage(state, action: PayloadAction<number>) {
            state.rightPanel.search.searchPage = action.payload;
        },
        setRightPanelMode(state, action: PayloadAction<"SEARCH" | "HISTORY">) {
            state.rightPanel.mode = action.payload;
        },
    },
});

export const {
    openMarkdownTab,
    closeTab,
    setActiveTab,
    patchTabState,
    patchEditorState,
    patchPreviewerState,
    setFontSize,
    setPreviewDarkMode,
    reorderTabs,
    reopenLastClosedTab,
    setSearchText,
    setSearchPage,
    setRightPanelMode,
} = appSlice.actions;
export default appSlice;
